import HeroSection from '../components/HeroSection'
import ClassSelector from '../components/ClassSelector'
import NewsSection from '../components/NewsSection'

export default function HomePage() {
  return (
    <div className="px-6 pt-4 pb-4 space-y-4">
      <HeroSection />
      <ClassSelector />
      <NewsSection />
    </div>
  )
}
