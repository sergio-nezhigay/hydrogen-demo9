import {useState, useEffect} from 'react';
import {Image} from '@shopify/hydrogen';

import {cn, useTranslation} from '~/lib/utils';
import {Link} from '~/components/Link';
const phoneNumber = '+380507025777';

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const {translation} = useTranslation();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const buttonStyle =
    'font-bold inline-block px-6 py-3 mt-4 bg-white/90 text-indigo-900 rounded-lg hover:bg-indigo-700 hover:text-white transition-color';

  // Multiple shadow text border effect
  const textShadowStyle = {
    textShadow: `
      0.05em 0 black,
      0 0.05em black,
      -0.05em 0 black,
      0 -0.05em black,
      -0.05em -0.05em black,
      -0.05em 0.05em black,
      0.05em -0.05em black,
      0.05em 0.05em black
    `,
  };

  return (
    <section className="relative w-full min-h-[200px] h-[70vh] lg:h-[700px] flex sm-max:content-start md:content-center align-center sm-max:pt-[200px] md:flex-center text-white">
      <picture>
        <source
          media="(min-width: 768px)"
          srcSet="https://cdn.shopify.com/s/files/1/0868/0462/7772/files/future-desktop-narrow-compressed.webp?v=1728656179"
        />
        <Image
          src="https://cdn.shopify.com/s/files/1/0868/0462/7772/files/future-mobile-compressed.webp?v=1728656179"
          className="absolute inset-0 h-full object-cover object-[center_90%]"
          alt="Комп'ютер майбутнього"
          sizes="100vw"
        />
      </picture>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-600 via-stone-900 to-stone-600 opacity-10" />

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <h1
          className={`text-3xl lg:text-5xl transform font-bold transition-all duration-300 ease-in-out sm-max:mb-10`}
          style={textShadowStyle}
        >
          {translation.hero_title}
        </h1>
        <p
          className={`text-xl lg:text-4xl sm-max:max-w-[200px] mx-auto text-gray-200 transform transition-all duration-300 ease-in-out delay-300 sm-max:mb-10`}
          style={textShadowStyle}
        >
          {translation.hero_description}
        </p>
        <div
          className={` mx-auto transition-all duration-1000 ease-in-out delay-1000 ${
            isVisible
              ? 'opacity-100  translate-y-0'
              : 'opacity-0  translate-y-4'
          }`}
        >
          <a
            href={`tel:${phoneNumber}`}
            className={cn('md:hidden ', buttonStyle)}
          >
            {translation.hero_button}
          </a>
          <Link
            to={`/pages/contact`}
            className={cn('sm-max:hidden ', buttonStyle)}
          >
            {translation.hero_button}
          </Link>
        </div>
      </div>
    </section>
  );
}
