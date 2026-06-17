import { SplashLoader } from '@/components/SplashLoader';

// Entry route. The root navigator redirects to the right group once auth
// state is resolved; until then we show the branded splash.
export default function Index() {
  return <SplashLoader />;
}
