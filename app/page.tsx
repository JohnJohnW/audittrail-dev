import {
  Header,
  Hero,
  Problem,
  HowItWorks,
  Frameworks,
  Pricing,
  Careers,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Frameworks />
        <Pricing />
        <Careers />
      </main>
      <Footer />
    </>
  );
}
