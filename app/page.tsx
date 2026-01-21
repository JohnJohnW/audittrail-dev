import {
  Header,
  Hero,
  SocialProof,
  Problem,
  HowItWorks,
  Frameworks,
  Pricing,
  FAQ,
  CTA,
  Careers,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <SocialProof />
        <Problem />
        <HowItWorks />
        <Frameworks />
        <Pricing />
        <FAQ />
        <Careers />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
