import { ModernNavbar } from '@/components/landing/ModernNavbar';
import { ModernHero } from '@/components/landing/ModernHero';
import { ModernFeatures } from '@/components/landing/ModernFeatures';
import { ModernHowItWorks } from '@/components/landing/ModernHowItWorks';
import { ModernBenefits } from '@/components/landing/ModernBenefits';
import { ModernCTA } from '@/components/landing/ModernCTA';
import { ModernFooter } from '@/components/landing/ModernFooter';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <ModernNavbar />
      <ModernHero />
      <ModernFeatures />
      <ModernHowItWorks />
      <ModernBenefits />
      <ModernCTA />
      <ModernFooter />
    </div>
  );
}
