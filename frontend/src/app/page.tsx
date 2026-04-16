import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="text-lg font-semibold">MuSync</Link>
        <nav className="flex items-center gap-3">
          <Link href="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link href="/signup"><Button>Get started</Button></Link>
        </nav>
      </header>

      <section className="container py-24 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-semibold leading-tight md:text-6xl">
          Background music tuned to how you focus.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-muted-foreground">
          Pick a mood, write a prompt, and start a focus session. MuSync streams seed loops
          instantly while it generates a personalized track in the background.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link href="/signup"><Button size="lg">Start a focus session</Button></Link>
          <Link href="/login"><Button size="lg" variant="outline">I have an account</Button></Link>
        </div>
      </section>

      <section className="container grid gap-6 py-16 md:grid-cols-3">
        {[
          { title: "Six moods", body: "Focus, calm, sleep, rainy, happy chill, night drive — each tuned for a different mode." },
          { title: "Prompt-driven", body: "Add your own prompt to steer instrumentation. No vocals, seamless loops." },
          { title: "Personal library", body: "Every generation is saved to your library and re-playable across sessions." },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="container border-t py-8 text-sm text-muted-foreground">
        &copy; MuSync MVP
      </footer>
    </main>
  );
}
