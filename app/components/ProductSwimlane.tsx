import type {
  HomepageFeaturedProductsQuery,
  ProductCardFragment,
} from 'storefrontapi.generated';
import {Section} from '~/components/Text';
import {ProductCard} from '~/components/ProductCard';
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
  return (
    <Section
      heading={title}
      {...props}
      padding="y"
      display="flex"
      className="flex flex-col"
    >
      <Gallery
        nodesArray={products.nodes}
        ChildComponent={ProductCardWrapper}
        itemClasses="pl-4 basis-1/2 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
      />
    </Section>
  );
}

export type ProductCardWrapperProps = {
  index: number;
  childData: ProductCardFragment;
};

function ProductCardWrapper({childData}: ProductCardWrapperProps) {
  return <ProductCard product={childData} className="w-full" />;
}
