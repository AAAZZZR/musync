"""Stripe integration — checkout session / billing portal / webhook handling。"""

import logging
from functools import lru_cache

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import Profile

logger = logging.getLogger(__name__)


@lru_cache
def _get_stripe() -> stripe.StripeClient:
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise RuntimeError("STRIPE_SECRET_KEY not configured")
    return stripe.StripeClient(api_key=settings.stripe_secret_key)


async def ensure_customer(session: AsyncSession, profile: Profile) -> str:
    """取得或建立 Stripe customer，存進 profile。"""
    if profile.stripe_customer_id:
        return profile.stripe_customer_id

    client = _get_stripe()
    customer = client.customers.create(
        params={
            "email": profile.email,
            "name": profile.full_name,
            "metadata": {"profile_id": profile.id, "user_id": profile.user_id},
        }
    )
    profile.stripe_customer_id = customer.id
    await session.commit()
    await session.refresh(profile)
    return customer.id


async def create_checkout_url(session: AsyncSession, profile: Profile) -> str:
    settings = get_settings()
    if not settings.stripe_price_id_pro:
        raise RuntimeError("STRIPE_PRICE_ID_PRO not set")

    customer_id = await ensure_customer(session, profile)
    client = _get_stripe()
    checkout = client.checkout.sessions.create(
        params={
            "customer": customer_id,
            "mode": "subscription",
            "line_items": [{"price": settings.stripe_price_id_pro, "quantity": 1}],
            "success_url": f"{settings.app_url}/app/settings?billing=success",
            "cancel_url": f"{settings.app_url}/app/settings?billing=cancel",
            "allow_promotion_codes": True,
        }
    )
    if not checkout.url:
        raise RuntimeError("Checkout session missing url")
    return checkout.url


async def create_portal_url(profile: Profile) -> str:
    settings = get_settings()
    if not profile.stripe_customer_id:
        raise RuntimeError("No billing account yet")
    client = _get_stripe()
    portal = client.billing_portal.sessions.create(
        params={
            "customer": profile.stripe_customer_id,
            "return_url": f"{settings.app_url}/app/settings",
        }
    )
    return portal.url


def verify_webhook(payload: bytes, signature: str) -> stripe.Event:
    settings = get_settings()
    if not settings.stripe_webhook_secret:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET not configured")
    return stripe.Webhook.construct_event(payload, signature, settings.stripe_webhook_secret)


async def handle_subscription_change(session: AsyncSession, sub: stripe.Subscription) -> None:
    """customer.subscription.created / updated — 同步 profile.plan + track_limit。"""
    settings = get_settings()
    customer_id = sub.customer
    active = sub.status in ("active", "trialing")
    price_id = sub["items"]["data"][0]["price"]["id"] if sub["items"]["data"] else None

    period_end = getattr(sub, "current_period_end", None)
    from datetime import UTC, datetime

    period_end_dt = datetime.fromtimestamp(period_end, tz=UTC) if period_end else None

    stmt = select(Profile).where(Profile.stripe_customer_id == customer_id)
    profile = await session.scalar(stmt)
    if not profile:
        logger.warning("subscription for unknown customer %s", customer_id)
        return

    profile.plan = "pro" if active else "free"
    profile.track_limit = settings.stripe_pro_track_limit if active else 5
    profile.stripe_subscription_id = sub.id
    profile.stripe_price_id = price_id
    profile.stripe_current_period_end = period_end_dt
    await session.commit()


async def handle_subscription_deleted(session: AsyncSession, sub: stripe.Subscription) -> None:
    stmt = select(Profile).where(Profile.stripe_customer_id == sub.customer)
    profile = await session.scalar(stmt)
    if not profile:
        return
    profile.plan = "free"
    profile.track_limit = 5
    profile.stripe_subscription_id = None
    profile.stripe_price_id = None
    profile.stripe_current_period_end = None
    await session.commit()
