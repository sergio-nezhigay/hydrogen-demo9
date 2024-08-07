import {useRef, Suspense} from 'react';

import {Image} from '@shopify/hydrogen';
import {Disclosure, DisclosurePanel, Listbox} from '@headlessui/react';
import {ShoppingCart} from 'lucide-react';
import {
  defer,
  type MetaArgs,
  type LoaderFunctionArgs,
} from '@shopify/remix-oxygen';
import {useLoaderData, Await, useNavigate, useMatches} from '@remix-run/react';
import {
  getSeoMeta,
  VariantSelector,
  getSelectedProductOptions,
  Analytics,
} from '@shopify/hydrogen';
import invariant from 'tiny-invariant';
import clsx from 'clsx';

import type {
  MediaFragment,
  ProductQuery,
  ProductVariantFragmentFragment,
} from 'storefrontapi.generated';
import {Heading, Section, Text} from '~/components/Text';
import {Link} from '~/components/Link';
import {Button} from '~/components/Button';
import {AddToCartButton} from '~/components/AddToCartButton';
import {Skeleton} from '~/components/Skeleton';
import {ProductSwimlane} from '~/components/ProductSwimlane';
import {IconCaret, IconCheck, IconClose} from '~/components/Icon';
import {getExcerpt, useTranslation} from '~/lib/utils';
import {seoPayload} from '~/lib/seo.server';
import type {Storefront} from '~/lib/type';
import {routeHeaders} from '~/data/cache';
import {MEDIA_FRAGMENT, PRODUCT_CARD_FRAGMENT} from '~/data/fragments';
import HryvniaMoney from '~/components/HryvniaMoney';
import {translations} from '~/data/translations';
import {addJudgemeReview, getJudgemeReviews} from '~/lib/judgeme';
import {StarRating} from '~/modules/StarRating';
import {ReviewForm} from '~/modules/ReviewForm';
import ReviewList from '~/modules/ReviewList';
import {Gallery} from '~/modules/Gallery';

export const headers = routeHeaders;

export const handle = {
  breadcrumbType: 'product',
};

export async function loader(args: LoaderFunctionArgs) {
  const {productHandle} = args.params;
  invariant(productHandle, 'Missing productHandle param, check route filename');

  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return defer({
    ...deferredData,
    ...criticalData,
  });
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({
  params,
  request,
  context,
}: LoaderFunctionArgs) {
  const {productHandle, locale: rawLocale = 'uk'} = params;
  const locale = rawLocale as keyof typeof translations;
  invariant(productHandle, 'Missing productHandle param, check route filename');

  const judgeme_API_TOKEN = context.env.JUDGEME_PUBLIC_TOKEN;
  const shop_domain = context.env.PUBLIC_STORE_DOMAIN;
  const judgemeReviewsData = await getJudgemeReviews(
    judgeme_API_TOKEN,
    shop_domain,
    productHandle,
  );

  const selectedOptions = getSelectedProductOptions(request);

  const [{shop, product}] = await Promise.all([
    context.storefront.query(PRODUCT_QUERY, {
      variables: {
        handle: productHandle,
        selectedOptions,
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    throw new Response('product', {status: 404});
  }

  if (!product.selectedVariant && product.options.length) {
    // set the selectedVariant to the first variant if there is only one option
    if (product.options.length < 2) {
      product.selectedVariant = product.variants.nodes[0];
    }
  }

  const recommended = getRecommendedProducts(context.storefront, product.id);

  // TODO: firstVariant is never used because we will always have a selectedVariant due to redirect
  // Investigate if we can avoid the redirect for product pages with no search params for first variant
  const firstVariant = product.variants.nodes[0];
  const selectedVariant = product.selectedVariant ?? firstVariant;

  const seo = seoPayload.product({
    product,
    selectedVariant,
    url: request.url,
    judgemeReviewsData,
  });

  return {
    product,
    shop,
    storeDomain: shop.primaryDomain.url,
    recommended,
    seo,
    judgemeReviewsData,
    locale,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({params, context}: LoaderFunctionArgs) {
  const {productHandle} = params;

  invariant(productHandle, 'Missing productHandle param, check route filename');

  // In order to show which variants are available in the UI, we need to query
  // all of them. But there might be a *lot*, so instead separate the variants
  // into it's own separate query that is deferred. So there's a brief moment
  // where variant options might show as available when they're not, but after
  // this deferred query resolves, the UI will update.
  const variants = context.storefront.query(VARIANTS_QUERY, {
    variables: {
      handle: productHandle,
      country: context.storefront.i18n.country,
      language: context.storefront.i18n.language,
    },
  });

  return {variants};
}

export const meta = ({matches}: MetaArgs<typeof loader>) => {
  return getSeoMeta(...matches.map((match) => (match.data as any).seo));
};

export const action = async ({request, context}: LoaderFunctionArgs) => {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const rating = parseInt(formData.get('rating') as string);
  const title = name; // to make simpler
  const body = formData.get('body') as string;
  const productId = formData.get('productId') as string;

  if (!name || !email || !rating || !title || !body) {
    return {error: 'All fields are required'};
  }

  // Extract the numeric product ID from the global ID
  const numericProductId = productId.split('/').pop();
  if (!numericProductId) {
    return {error: 'Invalid product ID'};
  }

  try {
    await addJudgemeReview({
      api_token: context.env.JUDGEME_PUBLIC_TOKEN,
      shop_domain: context.env.PUBLIC_STORE_DOMAIN,
      id: parseInt(numericProductId),
      email,
      name,
      rating,
      title,
      body,
    });

    return {success: true};
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error submitting review:', error);
    return {
      error:
        'There was an error submitting your review. Please try again later.',
    };
  }
};

export default function Product() {
  const {product, shop, recommended, variants, locale, judgemeReviewsData} =
    useLoaderData<typeof loader>();
  const {media, title, vendor, descriptionHtml} = product;
  const {shippingPolicy, refundPolicy} = shop;
  const translation = useTranslation();
  const rating = judgemeReviewsData?.rating ?? 0;
  const reviewNumber = judgemeReviewsData?.reviewNumber ?? 0;
  const reviews = judgemeReviewsData?.reviews ?? [];
  const handleScrollToReviews = (event: {preventDefault: () => void}) => {
    event.preventDefault();
    document
      .getElementById('review-list')
      ?.scrollIntoView({behavior: 'smooth'});
  };

  return (
    <>
      <Section padding="y">
        <div className="grid items-start md:grid-cols-2 md:gap-6 lg:gap-20">
          <Gallery
            galleryItems={media.nodes}
            GalleryItemComponent={ProductImage}
            showThumbs={true}
            //itemClasses="bg-primary/5"
          />
          <div className="hiddenScroll sticky md:top-nav md:-mb-nav md:h-screen md:-translate-y-nav md:overflow-y-scroll md:pt-nav">
            <section className="flex w-full flex-col gap-8 md:mx-auto">
              <div className="grid gap-2">
                <Heading as="h1" className="overflow-hidden whitespace-normal ">
                  {title}
                </Heading>
                <div
                  className={clsx({
                    'flex-between': reviewNumber > 0,
                    'flex-end': reviewNumber === 0,
                  })}
                >
                  {reviewNumber > 0 && (
                    <a
                      href="#review-list"
                      className="space-x-2 flex"
                      onClick={handleScrollToReviews}
                    >
                      <StarRating rating={rating} />
                      <span className="align-top">({reviewNumber})</span>
                    </a>
                  )}

                  {product.selectedVariant?.sku && (
                    <span className="text-primary/70">
                      Код:&nbsp;{product.selectedVariant?.sku}
                    </span>
                  )}
                </div>
              </div>
              <Suspense fallback={<ProductForm variants={[]} />}>
                <Await
                  errorElement="There was a problem loading related products"
                  resolve={variants}
                >
                  {(resp) => (
                    <ProductForm
                      variants={resp.product?.variants.nodes || []}
                    />
                  )}
                </Await>
              </Suspense>
              <div className="grid gap-4 py-4">
                {descriptionHtml && (
                  <ProductDetail
                    title={translation.description}
                    content={descriptionHtml}
                    isOpen={true}
                  />
                )}
                {shippingPolicy?.body && (
                  <ProductDetail
                    title={translation.shipping}
                    content={getExcerpt(shippingPolicy.body)}
                    learnMore={`/policies/${shippingPolicy.handle}`}
                  />
                )}
                {refundPolicy?.body && (
                  <ProductDetail
                    title={translation.returns}
                    content={getExcerpt(refundPolicy.body)}
                    learnMore={`/policies/${refundPolicy.handle}`}
                  />
                )}
              </div>
            </section>
          </div>
        </div>
      </Section>
      <Suspense fallback={<Skeleton className="h-32" />}>
        <Await
          errorElement="There was a problem loading related products"
          resolve={recommended}
        >
          {(products) => (
            <ProductSwimlane
              title={translation.also_interested}
              products={products}
            />
          )}
        </Await>
      </Suspense>
      <div id="review-list">
        <ReviewList reviews={reviews} title={translation.reviews} />
      </div>

      <ReviewForm productId={product.id} locale={locale} />
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: product.selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: product.selectedVariant?.id || '',
              variantTitle: product.selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </>
  );
}

export type ProductImageProps = {
  itemData: MediaFragment;
  index: number;
};

function ProductImage({itemData, index}: ProductImageProps) {
  const image =
    itemData.__typename === 'MediaImage'
      ? {...itemData.image, altText: itemData.alt || 'Product image ' + index}
      : null;
  return (
    <div className="bg-primary/5">
      {image && (
        <Image
          loading={index === 0 ? 'eager' : 'lazy'}
          data={image}
          aspectRatio={'1/1'}
          sizes="auto"
          className="object-cover w-full h-full"
        />
      )}
    </div>
  );
}

export function ProductForm({
  variants,
}: {
  variants: ProductVariantFragmentFragment[];
}) {
  const {product, storeDomain, locale} = useLoaderData<typeof loader>();
  const translation = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);

  /**
   * Likewise, we're defaulting to the first variant for purposes
   * of add to cart if there is none returned from the loader.
   * A developer can opt out of this, too.
   */
  const selectedVariant = product.selectedVariant!;
  const isOutOfStock = !selectedVariant?.availableForSale;
  const isOnSale =
    selectedVariant?.price?.amount &&
    selectedVariant?.compareAtPrice?.amount &&
    selectedVariant?.price?.amount < selectedVariant?.compareAtPrice?.amount;

  const navigate = useNavigate();

  return (
    <>
      <VariantSelector
        handle={product.handle}
        options={product.options}
        variants={variants}
      >
        {({option}) => {
          const valuesNumber = option.values.length;
          return valuesNumber > 1 ? (
            <div
              key={option.name}
              className="mb-4 flex flex-col flex-wrap gap-y-2 last:mb-0"
            >
              <Heading as="legend" size="lead" className="min-w-16">
                {option.name}
              </Heading>

              <div className="flex flex-wrap items-baseline gap-4">
                {valuesNumber > 7 ? (
                  <div className="relative w-full">
                    <Listbox
                      onChange={(selectedOption) => {
                        const value = option.values.find(
                          (v) => v.value === selectedOption,
                        );

                        if (value) {
                          navigate(value.to);
                        }
                      }}
                    >
                      {({open}) => (
                        <>
                          <Listbox.Button
                            ref={closeRef}
                            className={clsx(
                              'flex w-full items-center justify-between border border-primary px-4 py-3',
                              open
                                ? 'rounded-b md:rounded-b-none md:rounded-t'
                                : 'rounded',
                            )}
                          >
                            <span>{option.value}</span>

                            <IconCaret direction={open ? 'up' : 'down'} />
                          </Listbox.Button>
                          <Listbox.Options
                            className={clsx(
                              'absolute bottom-12 z-30 grid h-48 w-full overflow-y-scroll rounded-t border border-primary bg-contrast p-2 transition-[max-height] duration-150 sm:bottom-auto md:rounded-b md:rounded-t-none md:border-b md:border-t-0',
                              open ? 'max-h-48' : 'max-h-0',
                            )}
                          >
                            {option.values
                              .filter((value) => value.isAvailable)
                              .map(({value, to, isActive}) => (
                                <Listbox.Option
                                  key={`option-${option.name}-${value}`}
                                  value={value}
                                >
                                  {({active}) => (
                                    <Link
                                      to={to}
                                      preventScrollReset
                                      className={clsx(
                                        'flex w-full cursor-pointer items-center justify-start rounded p-2 text-left text-primary transition',
                                        active && 'bg-primary/10',
                                      )}
                                      onClick={() => {
                                        if (!closeRef?.current) return;
                                        closeRef.current.click();
                                      }}
                                    >
                                      {value}
                                      {isActive && (
                                        <span className="ml-2">
                                          <IconCheck />
                                        </span>
                                      )}
                                    </Link>
                                  )}
                                </Listbox.Option>
                              ))}
                          </Listbox.Options>
                        </>
                      )}
                    </Listbox>
                  </div>
                ) : (
                  option.values.map(({value, isAvailable, isActive, to}) => (
                    <Link
                      key={option.name + value}
                      to={to}
                      preventScrollReset
                      prefetch="intent"
                      replace
                      className={clsx(
                        'cursor-pointer border-b-[1.5px] py-1 leading-none transition-all duration-200',
                        isActive ? 'border-primary/50' : 'border-primary/0',
                        isAvailable ? 'opacity-100' : 'opacity-50',
                      )}
                    >
                      {value}
                    </Link>
                  ))
                )}
              </div>
            </div>
          ) : (
            <></>
          );
        }}
      </VariantSelector>
      {selectedVariant && (
        <>
          {isOutOfStock ? (
            <Button variant="secondary" disabled>
              <Text>{translation.sold_out}</Text>
            </Button>
          ) : (
            <div className="md:flex-start gap-4">
              <div className="sm-max:mb-4">
                <p className="mb-1">{translation.available}</p>
                <HryvniaMoney
                  data={selectedVariant.price!}
                  className="text-xl md:text-3xl"
                />
                {isOnSale && (
                  <HryvniaMoney
                    data={selectedVariant?.compareAtPrice!}
                    className="strike opacity-50 inline"
                  />
                )}
              </div>

              <AddToCartButton
                lines={[
                  {
                    merchandiseId: selectedVariant.id!,
                    quantity: 1,
                  },
                ]}
                variant="red"
                data-test="add-to-cart"
                className="sm-max:w-full"
              >
                <ShoppingCart className="mr-4 size-6" />
                <Text
                  as="span"
                  className="flex items-center justify-center gap-2"
                >
                  <span>{translation.buy}</span>
                </Text>
              </AddToCartButton>
            </div>
          )}
        </>
      )}
    </>
  );
}

function ProductDetail({
  title,
  content,
  learnMore,
  isOpen = false,
}: {
  title: string;
  content: string;
  learnMore?: string;
  isOpen?: boolean;
}) {
  const translation = useTranslation();

  return (
    <Disclosure
      key={title}
      defaultOpen={isOpen}
      as="div"
      className="grid w-full gap-2"
    >
      {({open}) => (
        <>
          <Disclosure.Button className="text-left">
            <div className="flex justify-between">
              <Text size="lead" as="h4">
                {title}
              </Text>
              <IconClose
                className={clsx(
                  'transform-gpu transition-transform duration-200',
                  !open && 'rotate-45',
                )}
              />
            </div>
          </Disclosure.Button>

          <DisclosurePanel
            transition
            className={
              'grid gap-2 pb-4 pt-2 origin-top transition duration-200 ease-out data-[closed]:-translate-y-8 data-[closed]:opacity-0'
            }
          >
            <div
              //  className="prose dark:prose-invert"
              dangerouslySetInnerHTML={{__html: content}}
            />
            {learnMore && (
              <div className="">
                <Link
                  className="border-b border-primary/30 pb-px text-primary/50"
                  to={learnMore}
                >
                  {translation.learn_more}
                </Link>
              </div>
            )}
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariantFragment on ProductVariant {
    id
    availableForSale
    selectedOptions {
      name
      value
    }
    image {
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
  }
`;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      vendor
      handle
      descriptionHtml
      description
      options {
        name
        values
      }
      selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
        ...ProductVariantFragment
      }
      media(first: 7) {
        nodes {
          ...Media
        }
      }
      variants(first: 1) {
        nodes {
          ...ProductVariantFragment
        }
      }
      seo {
        description
        title
      }
      collections(first: 1) {
        nodes {
            title
            handle
        }
      }
    }
    shop {
      name
      primaryDomain {
        url
      }
      shippingPolicy {
        body
        handle
      }
      refundPolicy {
        body
        handle
      }
    }
  }
  ${MEDIA_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const VARIANTS_QUERY = `#graphql
  query variants(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      variants(first: 250) {
        nodes {
          ...ProductVariantFragment
        }
      }
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  query productRecommendations(
    $productId: ID!
    $count: Int
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    recommended: productRecommendations(productId: $productId) {
      ...ProductCard
    }
    additional: products(first: $count, sortKey: BEST_SELLING) {
      nodes {
        ...ProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

async function getRecommendedProducts(
  storefront: Storefront,
  productId: string,
) {
  const products = await storefront.query(RECOMMENDED_PRODUCTS_QUERY, {
    variables: {productId, count: 6},
  });

  invariant(products, 'No data returned from Shopify API');

  const mergedProducts = (products.recommended ?? [])
    .concat(products.additional.nodes)
    .filter(
      (value, index, array) =>
        array.findIndex((value2) => value2.id === value.id) === index,
    );

  const originalProduct = mergedProducts.findIndex(
    (item) => item.id === productId,
  );

  mergedProducts.splice(originalProduct, 1);

  return {nodes: mergedProducts};
}
