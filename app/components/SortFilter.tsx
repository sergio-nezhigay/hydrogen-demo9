import type {SyntheticEvent} from 'react';
import {useMemo, useState} from 'react';
import {Menu, Disclosure, DisclosurePanel} from '@headlessui/react';
import type {Location} from '@remix-run/react';
import {Check} from 'lucide-react';
import {
  Link,
  useLocation,
  useSearchParams,
  useNavigate,
  useRouteLoaderData,
} from '@remix-run/react';
import useDebounce from 'react-use/esm/useDebounce';
import type {
  Filter,
  ProductFilter,
} from '@shopify/hydrogen/storefront-api-types';

import {Heading, Text} from '~/components/Text';
import {IconFilters, IconCaret, IconXMark} from '~/components/Icon';
import {
  DEFAULT_LOCALE,
  customTranslate,
  sortFilters,
  useTranslation,
  useViewType,
} from '~/lib/utils';
import type {RootLoader} from '~/root';
import {translations} from '~/data/translations';

import {useDrawer, Drawer} from './Drawer';

export type AppliedFilter = {
  label: string;
  filter: ProductFilter;
};

export type SortParam =
  | 'price-low-high'
  | 'price-high-low'
  | 'best-selling'
  | 'newest'
  | 'featured';

export type SortFilterProps = {
  filters: Filter[];
  appliedFilters?: AppliedFilter[];
  children: React.ReactNode;
  collections?: Array<{handle: string; title: string}>;
};

export const FILTER_URL_PREFIX = 'filter.';

export function SortFilter({
  filters,
  appliedFilters = [],
  children,
}: SortFilterProps) {
  const isMobile = useViewType();
  return (
    <>
      {isMobile ? (
        <>
          <div className="flex-between">
            <FiltersDrawer filters={filters} appliedFilters={appliedFilters} />
            <SortMenu />
          </div>

          <div className="flex flex-col flex-wrap md:flex-row">
            <div className="flex-1">{children}</div>
          </div>
        </>
      ) : (
        <>
          <div className="flex">
            <>
              {appliedFilters.length > 0 && (
                <AppliedFilters filters={appliedFilters} />
              )}
            </>
            <div className="ml-auto">
              <SortMenu />
            </div>
          </div>
          <div className="flex flex-col flex-wrap md:flex-row">
            <div className="opacity-100 min-w-full md:min-w-[240px] md:w-[240px] md:pr-8 max-h-full">
              <Filters filters={filters} />
            </div>

            <div className="flex-1">{children}</div>
          </div>
        </>
      )}
    </>
  );
}

function Filters({filters}: {filters: Filter[]}) {
  const [params] = useSearchParams();
  const location = useLocation();
  const translation = useTranslation();
  const sortedFilters = filters.sort((a, b) => sortFilters(a, b));

  const filterMarkup = (filter: Filter, option: Filter['values'][0]) => {
    const appliedFilter = {
      filter: JSON.parse(option.input as string),
      label: option.label,
    } as AppliedFilter;
    switch (filter.type) {
      case 'PRICE_RANGE':
        const priceFilter = params.get(`${FILTER_URL_PREFIX}price`);
        const price = priceFilter
          ? (JSON.parse(priceFilter) as ProductFilter['price'])
          : undefined;
        const min = isNaN(Number(price?.min)) ? undefined : Number(price?.min);
        const max = isNaN(Number(price?.max)) ? undefined : Number(price?.max);

        return <PriceRangeFilter min={min} max={max} />;

      default:
        const to = getFilterLink(option.input as string, params, location);
        const isActive =
          params.toString() ===
          new URLSearchParams(to.split('?')[1]).toString();

        const appliedFilterLink = getAppliedFilterLink(
          appliedFilter,
          params,
          location,
        );

        return (
          <Link
            prefetch="intent"
            to={isActive ? appliedFilterLink : to}
            className="flex-start gap-2 hover:bg-slate-100 px-1 rounded-sm group "
          >
            <span className="size-4 inline-block border border-stone-300 rounded-sm group-hover:border-stone-800">
              {isActive && (
                <Check className="size-4 text-slate-50 bg-headerBg" />
              )}
            </span>

            <span>{customTranslate(option.label)}</span>
          </Link>
        );
    }
  };

  return (
    <>
      <nav className="py-4">
        <Heading as="h4" size="lead" className="pb-4">
          {translation.filter_by}
        </Heading>
        <div className="divide-y">
          {sortedFilters.map((filter: Filter) => (
            <Disclosure
              defaultOpen={true}
              as="div"
              key={filter.id}
              className="w-full"
            >
              {({open}) => (
                <>
                  <Disclosure.Button className="flex justify-between w-full py-1">
                    <Text
                      size="lead"
                      className="text-secondary font-normal hover:text-red"
                    >
                      {filter.label}
                    </Text>
                    <IconCaret direction={open ? 'up' : 'down'} />
                  </Disclosure.Button>
                  <DisclosurePanel key={filter.id}>
                    <ul key={filter.id} className="py-2">
                      {filter.values?.map((option) => {
                        return (
                          <li key={option.id} className="pb-2">
                            {filterMarkup(filter, option)}
                          </li>
                        );
                      })}
                    </ul>
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>
          ))}
        </div>
      </nav>
    </>
  );
}

function AppliedFilters({filters = []}: {filters: AppliedFilter[]}) {
  const [params] = useSearchParams();
  const location = useLocation();

  return (
    <div className="flex items-center flex-wrap gap-2">
      {filters.map((filter: AppliedFilter) => {
        return (
          <Link
            to={getAppliedFilterLink(filter, params, location)}
            className="flex px-2 border rounded-full gap hover:bg-slate-100"
            key={filter.label}
          >
            <span className="flex-grow">{customTranslate(filter.label)}</span>
            <span>
              <IconXMark />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function getAppliedFilterLink(
  filter: AppliedFilter,
  params: URLSearchParams,
  location: Location,
): string {
  const paramsClone = new URLSearchParams(params);

  Object.entries(filter.filter).forEach(([key, value]) => {
    const fullKey = FILTER_URL_PREFIX + key;
    if (value != null) {
      paramsClone.delete(fullKey, JSON.stringify(value));
    }
  });
  const resultUrl = `${location.pathname}?${paramsClone.toString()}`;
  return resultUrl;
}

function getSortLink(
  sort: SortParam,
  params: URLSearchParams,
  location: Location,
) {
  params.set('sort', sort);
  return `${location.pathname}?${params.toString()}`;
}

function getFilterLink(
  rawInput: string | ProductFilter,
  params: URLSearchParams,
  location: ReturnType<typeof useLocation>,
) {
  const paramsClone = new URLSearchParams(params);
  const newParams = filterInputToParams(rawInput, paramsClone);
  return `${location.pathname}?${newParams.toString()}`;
}

const PRICE_RANGE_FILTER_DEBOUNCE = 500;

function PriceRangeFilter({max, min}: {max?: number; min?: number}) {
  const location = useLocation();

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const translation = useTranslation();
  const navigate = useNavigate();
  const [minPrice, setMinPrice] = useState(min);
  const [maxPrice, setMaxPrice] = useState(max);

  useDebounce(
    () => {
      if (minPrice === undefined && maxPrice === undefined) {
        params.delete(`${FILTER_URL_PREFIX}price`);
        navigate(`${location.pathname}?${params.toString()}`);
        return;
      }

      const price = {
        ...(minPrice === undefined ? {} : {min: minPrice}),
        ...(maxPrice === undefined ? {} : {max: maxPrice}),
      };
      const newParams = filterInputToParams({price}, params);
      navigate(`${location.pathname}?${newParams.toString()}`);
    },
    PRICE_RANGE_FILTER_DEBOUNCE,
    [minPrice, maxPrice],
  );

  const onChangeMax = (event: SyntheticEvent) => {
    const value = (event.target as HTMLInputElement).value;
    const newMaxPrice = Number.isNaN(parseFloat(value))
      ? undefined
      : parseFloat(value);
    setMaxPrice(newMaxPrice);
  };

  const onChangeMin = (event: SyntheticEvent) => {
    const value = (event.target as HTMLInputElement).value;
    const newMinPrice = Number.isNaN(parseFloat(value))
      ? undefined
      : parseFloat(value);
    setMinPrice(newMinPrice);
  };

  return (
    <div className="flex gap-2 mb-1">
      <label>
        <span>{translation.from}</span>
        <input
          name="minPrice"
          className="text-black w-full"
          type="number"
          value={minPrice ?? ''}
          placeholder={'₴'}
          onChange={onChangeMin}
        />
      </label>
      <label>
        <span>{translation.to}</span>
        <input
          name="maxPrice"
          className="text-black w-full"
          type="number"
          value={maxPrice ?? ''}
          placeholder={'₴'}
          onChange={onChangeMax}
        />
      </label>
    </div>
  );
}

function filterInputToParams(
  rawInput: string | ProductFilter,
  params: URLSearchParams,
) {
  const input =
    typeof rawInput === 'string'
      ? (JSON.parse(rawInput) as ProductFilter)
      : rawInput;

  Object.entries(input).forEach(([key, value]) => {
    if (params.has(`${FILTER_URL_PREFIX}${key}`, JSON.stringify(value))) {
      return;
    }
    if (key === 'price') {
      // For price, we want to overwrite
      params.set(`${FILTER_URL_PREFIX}${key}`, JSON.stringify(value));
    } else {
      params.append(`${FILTER_URL_PREFIX}${key}`, JSON.stringify(value));
    }
  });

  return params;
}

export default function SortMenu() {
  const [params] = useSearchParams();
  const location = useLocation();
  const rootData = useRouteLoaderData<RootLoader>('root');
  const selectedLocale = rootData?.selectedLocale ?? DEFAULT_LOCALE;
  const locale =
    selectedLocale.language.toLowerCase() as keyof typeof translations;
  const translation = translations[locale];
  const items: {label: string; key: SortParam}[] = [
    {label: translation.featured, key: 'featured'},
    {
      label: translation.price_low_high ?? 'Price: Low - High',
      key: 'price-low-high',
    },
    {
      label: translation.price_high_low ?? 'Price: High - Low',
      key: 'price-high-low',
    },
    {
      label: translation.best_selling ?? 'Best Selling',
      key: 'best-selling',
    },
    {
      label: translation.newest ?? 'Newest',
      key: 'newest',
    },
  ];
  const activeItem = items.find((item) => item.key === params.get('sort'));

  return (
    <Menu as="div" className="shrink-0 row-start-1 col-start-2 relative z-10">
      {/*<Menu as="div" className="relative z-40">*/}
      <Menu.Button className="flex items-center hover:bg-stone-50 rounded-md py-1">
        <span className="px-2">
          <span className="px-2 font-medium">{translation.sort_by}:</span>
          <span>{(activeItem || items[0]).label}</span>
        </span>
        <IconCaret />
      </Menu.Button>

      <Menu.Items
        as="nav"
        className="absolute right-0 flex flex-col p-4 text-right rounded-sm
        bg-contrast"
      >
        {items.map((item) => (
          <Menu.Item key={item.label}>
            {() => (
              <Link
                className={`block text-sm pb-2 px-3 hover:font-bold ${
                  activeItem?.key === item.key ? 'font-bold' : 'font-normal'
                }`}
                to={getSortLink(item.key, params, location)}
              >
                {item.label}
              </Link>
            )}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  );
}

interface FiltersDrawerProps {
  filters: Filter[];
  appliedFilters?: AppliedFilter[];
}

function FiltersDrawer({filters, appliedFilters}: FiltersDrawerProps) {
  const {
    isOpen: isOpen,
    openDrawer: onOpen,
    closeDrawer: onClose,
  } = useDrawer();
  return (
    <>
      <button
        onClick={onOpen}
        className="size-8 flex-center hover:bg-stone-700/5 rounded-md"
      >
        <IconFilters />
      </button>
      <Drawer open={isOpen} onClose={onClose} openFrom="left">
        <div className="p-4">
          <div className="min-h-[26px]">
            {appliedFilters && appliedFilters.length > 0 && (
              <AppliedFilters filters={appliedFilters} />
            )}
          </div>

          <Filters filters={filters} />
        </div>
      </Drawer>
    </>
  );
}
