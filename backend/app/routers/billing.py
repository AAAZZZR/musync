from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.dependencies import get_current_profile
from app.models import Profile
from app.schemas import BillingUrlOut
from app.services import billing

router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.post("/checkout", response_model=BillingUrlOut)
async def checkout(
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> BillingUrlOut:
    try:
        url = await billing.create_checkout_url(session, profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return BillingUrlOut(url=url)


@router.post("/portal", response_model=BillingUrlOut)
async def portal(profile: Profile = Depends(get_current_profile)) -> BillingUrlOut:
    if not profile.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account yet")
    try:
        url = await billing.create_portal_url(profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return BillingUrlOut(url=url)


@router.post("/webhook")
async def webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> Response:
    signature = request.headers.get("stripe-signature")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    payload = await request.body()
    try:
        event = billing.verify_webhook(payload, signature)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Signature verify failed: {e}")

    if event.type in ("customer.subscription.created", "customer.subscription.updated"):
        await billing.handle_subscription_change(session, event.data.object)
    elif event.type == "customer.subscription.deleted":
        await billing.handle_subscription_deleted(session, event.data.object)

    return Response(status_code=200)
