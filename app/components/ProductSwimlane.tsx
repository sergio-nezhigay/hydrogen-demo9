import type {HomepageFeaturedProductsQuery} from 'storefrontapi.generated';
import {Section} from '~/components/Text';
import {ProductCard} from '~/components/ProductCard';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  CarouselApi,
} from './ui/carousel';
import {DotButtons} from '~/modules/DotButtons';
import {useCallback, useEffect, useState} from 'react';
import {Gallery} from '~/modules/Gallery';

const mockProducts = {
  nodes: new Array(12).fill(''),
};

type ProductSwimlaneProps = HomepageFeaturedProductsQuery & {
  title?: string;
  count?: number;
};

export function ProductSwimlane({
  title = 'Featured Products',
  products = mockProducts,
  count = 12,
  ...props
}: ProductSwimlaneProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const scrollTo = useCallback(
    (index: number) => {
      if (!api) return;
      api.scrollTo(index);
      setCurrent(api.selectedScrollSnap());
    },
    [api],
  );

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on('select', onSelect).on('reInit', onSelect);
    return () => {
      api.off('select', onSelect).off('reInit', onSelect);
    };
  }, [api, onSelect]);

  return (
    <Section
      heading={title}
      {...props}
      padding="y"
      display="flex"
      className="flex flex-col"
    >
      {/*<Gallery media={products.nodes} ChildComponent={ProductCard} />*/}
      <Carousel
        setApi={setApi}
        opts={{
          align: 'start',
        }}
      >
        <CarouselContent className="-ml-4">
          {products.nodes.map((product) => (
            <CarouselItem
              key={product.id}
              className=" pl-4 basis-1/2  md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
            >
              <ProductCard product={product} className="w-full" />
            </CarouselItem>
          ))}
        </CarouselContent>
        <DotButtons
          totalButtons={products.nodes.length}
          activeIndex={current}
          onButtonClick={scrollTo}
        />
        {/*<CarouselPrevious />
      <CarouselNext />*/}
      </Carousel>
    </Section>
  );
}
