import {useParams, Form, Await, useRouteLoaderData} from '@remix-run/react';
import useWindowScroll from 'react-use/esm/useWindowScroll';
import {Disclosure} from '@headlessui/react';
import {Suspense, useEffect, useMemo} from 'react';
import {CartForm, Image} from '@shopify/hydrogen';
import type {LanguageCode} from '@shopify/hydrogen/storefront-api-types';

import {type LayoutQuery} from 'storefrontapi.generated';
import {Text, Heading, Section} from '~/components/Text';
import {Link} from '~/components/Link';
import {Cart} from '~/components/Cart';
import {CartLoading} from '~/components/CartLoading';
import {Input} from '~/components/Input';
import {Drawer, useDrawer} from '~/components/Drawer';
import {CountrySelector} from '~/components/CountrySelector';
import {
  IconMenu,
  IconCaret,
  IconLogin,
  IconAccount,
  IconBag,
  IconSearch,
} from '~/components/Icon';
import {
  type EnhancedMenu,
  type ChildEnhancedMenuItem,
  useIsHomePath,
} from '~/lib/utils';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import {useCartFetchers} from '~/hooks/useCartFetchers';
import type {RootLoader} from '~/root';
import {translations} from '~/data/translations';

import LangSelector from '../modules/LangSelector';

type LayoutProps = {
  children: React.ReactNode;
  layout?: LayoutQuery & {
    headerMenu?: EnhancedMenu | null;
    footerMenu?: EnhancedMenu | null;
  };
  locale: keyof typeof translations;
};

export function PageLayout({children, layout, locale}: LayoutProps) {
  const {headerMenu, footerMenu} = layout || {};

  const logoUrl = layout?.shop.brand?.logo?.image?.url || '';

  return (
    <>
      <div className="flex min-h-screen flex-col">
        <div className="">
          <a href="#mainContent" className="sr-only">
            Skip to content
          </a>
        </div>
        {headerMenu && layout?.shop.name && (
          <Header
            title={layout.shop.name}
            menu={headerMenu}
            logoUrl={logoUrl}
          />
        )}
        <main role="main" id="mainContent" className=" grow">
          {children}
        </main>
      </div>
      {footerMenu && <Footer menu={footerMenu} locale={locale} />}
    </>
  );
}

function Header({
  title,
  menu,
  logoUrl,
}: {
  title: string;
  menu?: EnhancedMenu;
  logoUrl: string;
}) {
  const isHome = useIsHomePath();

  const {
    isOpen: isCartOpen,
    openDrawer: openCart,
    closeDrawer: closeCart,
  } = useDrawer();

  const {
    isOpen: isMenuOpen,
    openDrawer: openMenu,
    closeDrawer: closeMenu,
  } = useDrawer();

  const addToCartFetchers = useCartFetchers(CartForm.ACTIONS.LinesAdd);

  // toggle cart drawer when adding to cart
  useEffect(() => {
    if (isCartOpen || !addToCartFetchers.length) return;
    openCart();
  }, [addToCartFetchers, isCartOpen, openCart]);

  return (
    <>
      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
      {menu && (
        <MenuDrawer isOpen={isMenuOpen} onClose={closeMenu} menu={menu} />
      )}
      <DesktopHeader
        isHome={isHome}
        title={title}
        menu={menu}
        openCart={openCart}
        logoUrl={logoUrl}
      />
      <MobileHeader
        isHome={isHome}
        title={title}
        openCart={openCart}
        openMenu={openMenu}
        logoUrl={logoUrl}
      />
    </>
  );
}

function CartDrawer({isOpen, onClose}: {isOpen: boolean; onClose: () => void}) {
  const rootData = useRouteLoaderData<RootLoader>('root');
  if (!rootData) return null;

  return (
    <Drawer open={isOpen} onClose={onClose} heading="Кошик" openFrom="right">
      <div className="grid">
        <Suspense fallback={<CartLoading />}>
          <Await resolve={rootData?.cart}>
            {(cart) => <Cart layout="drawer" onClose={onClose} cart={cart} />}
          </Await>
        </Suspense>
      </div>
    </Drawer>
  );
}

export function MenuDrawer({
  isOpen,
  onClose,
  menu,
}: {
  isOpen: boolean;
  onClose: () => void;
  menu: EnhancedMenu;
}) {
  return (
    <Drawer open={isOpen} onClose={onClose} openFrom="left" heading="Menu">
      <div className="grid">
        <MenuMobileNav menu={menu} onClose={onClose} />
      </div>
    </Drawer>
  );
}

function MenuMobileNav({
  menu,
  onClose,
}: {
  menu: EnhancedMenu;
  onClose: () => void;
}) {
  return (
    <nav className="grid gap-4 p-6 sm:gap-6 sm:px-12 sm:py-8">
      {/* Top level menu items */}
      {(menu?.items || []).map((item) => (
        <span key={item.id} className="block">
          <Link
            to={item.to}
            target={item.target}
            onClick={onClose}
            className={({isActive}) =>
              isActive ? 'pb-1 border-b -mb-px' : 'pb-1'
            }
          >
            <Text as="span" size="copy">
              {item.title}
            </Text>
          </Link>
        </span>
      ))}
    </nav>
  );
}

function MobileHeader({
  title,
  isHome,
  openCart,
  openMenu,
  logoUrl,
}: {
  title: string;
  isHome: boolean;
  openCart: () => void;
  openMenu: () => void;
  logoUrl?: string;
}) {
  // useHeaderStyleFix(containerStyle, setContainerStyle, isHome);

  const params = useParams();

  return (
    <header
      role="banner"
      className={`sticky top-0
       z-40 flex h-nav w-full items-center justify-between gap-4 bg-contrast/80 px-4 leading-none text-primary backdrop-blur-lg md:px-8 lg:hidden`}
    >
      <div className="flex w-full items-center justify-start gap-4">
        <button
          onClick={openMenu}
          className="relative flex size-8 items-center justify-center"
        >
          <IconMenu />
        </button>
        <Form
          method="get"
          action={params.locale ? `/${params.locale}/search` : '/search'}
          className="items-center gap-2 sm:flex"
        >
          <button
            type="submit"
            className="relative flex size-8 items-center justify-center"
          >
            <IconSearch />
          </button>
          <Input
            className={
              isHome
                ? 'focus:border-contrast/20 dark:focus:border-primary/20'
                : 'focus:border-primary/20'
            }
            type="search"
            variant="minisearch"
            placeholder="Пошук"
            name="q"
          />
        </Form>
      </div>

      {logoUrl && (
        <Link
          className="flex size-full grow items-center justify-center self-stretch leading-[3rem] md:leading-[4rem]"
          to="/"
        >
          <Image
            width={50}
            height={40}
            className="h-10 w-auto"
            src={logoUrl}
            alt="logo"
          />
        </Link>
      )}

      <div className="flex w-full items-center justify-end gap-4">
        <AccountLink className="relative flex size-8 items-center justify-center" />
        <CartCount isHome={isHome} openCart={openCart} />
      </div>
    </header>
  );
}

function DesktopHeader({
  isHome,
  menu,
  openCart,
  title,
  logoUrl,
}: {
  isHome: boolean;
  openCart: () => void;
  menu?: EnhancedMenu;
  title: string;
  logoUrl?: string;
}) {
  const params = useParams();
  const {y} = useWindowScroll();
  return (
    <header
      role="banner"
      className={`bg-contrast/80 text-primary ${
        !isHome && y > 50 && ' shadow-lightHeader'
      } sticky top-0 z-40 hidden h-nav w-full items-center justify-between gap-8 px-12 py-8 leading-none backdrop-blur-lg transition duration-300 lg:flex`}
    >
      <div className="flex-center gap-12">
        {logoUrl && (
          <Link to="/" prefetch="intent" className="px-2">
            <Image
              width={80}
              height={80}
              className="w-20"
              src={logoUrl}
              alt="logo"
            />
          </Link>
        )}
        <nav className="flex gap-8">
          {/* Top level menu items */}
          {(menu?.items || []).map((item) => (
            <Link
              key={item.id}
              to={item.to}
              target={item.target}
              prefetch="intent"
              className={({isActive}) =>
                isActive ? 'pb-1 border-b -mb-px' : 'pb-1'
              }
            >
              {item.title}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-1">
        <Form
          method="get"
          action={params.locale ? `/${params.locale}/search` : '/search'}
          className="flex items-center gap-2"
        >
          <Input
            className={
              isHome
                ? 'focus:border-contrast/20 dark:focus:border-primary/20'
                : 'focus:border-primary/20'
            }
            type="search"
            variant="minisearch"
            placeholder="Пошук"
            name="q"
          />
          <button
            type="submit"
            className="relative flex size-8 items-center justify-center focus:ring-primary/5"
          >
            <IconSearch />
          </button>
        </Form>
        <LangSelector />
        <AccountLink className="relative flex size-8 items-center justify-center focus:ring-primary/5" />
        <CartCount isHome={isHome} openCart={openCart} />
      </div>
    </header>
  );
}

function AccountLink({className}: {className?: string}) {
  const rootData = useRouteLoaderData<RootLoader>('root');
  const isLoggedIn = rootData?.isLoggedIn;

  return (
    <Link to="/account" className={className}>
      <Suspense fallback={<IconLogin />}>
        <Await resolve={isLoggedIn} errorElement={<IconLogin />}>
          {(isLoggedIn) => (isLoggedIn ? <IconAccount /> : <IconLogin />)}
        </Await>
      </Suspense>
    </Link>
  );
}

function CartCount({
  isHome,
  openCart,
}: {
  isHome: boolean;
  openCart: () => void;
}) {
  const rootData = useRouteLoaderData<RootLoader>('root');
  if (!rootData) return null;

  return (
    <Suspense fallback={<Badge count={0} dark={isHome} openCart={openCart} />}>
      <Await resolve={rootData?.cart}>
        {(cart) => (
          <Badge
            dark={isHome}
            openCart={openCart}
            count={cart?.totalQuantity || 0}
          />
        )}
      </Await>
    </Suspense>
  );
}

function Badge({
  openCart,
  dark,
  count,
}: {
  count: number;
  dark: boolean;
  openCart: () => void;
}) {
  const isHydrated = useIsHydrated();

  const BadgeCounter = useMemo(
    () => (
      <>
        <IconBag />
        <div
          className={`${
            dark
              ? 'bg-contrast text-primary dark:bg-primary dark:text-contrast'
              : 'bg-primary text-contrast'
          } absolute bottom-1 right-1 flex h-3 w-auto min-w-3 items-center justify-center rounded-full px-0.5 pb-px text-center text-[0.625rem] font-medium leading-none subpixel-antialiased`}
        >
          <span>{count || 0}</span>
        </div>
      </>
    ),
    [count, dark],
  );

  return isHydrated ? (
    <button
      onClick={openCart}
      className="relative flex size-8 items-center justify-center focus:ring-primary/5"
    >
      {BadgeCounter}
    </button>
  ) : (
    <Link
      to="/cart"
      className="relative flex size-8 items-center justify-center focus:ring-primary/5"
    >
      {BadgeCounter}
    </Link>
  );
}

interface FooterProps {
  locale: keyof typeof translations;
  menu?: EnhancedMenu;
}

interface FooterItemProps {
  icon: string;
  title: string;
  content: React.ReactNode;
}

const FooterItem: React.FC<FooterItemProps> = ({icon, title, content}) => (
  <li className="grid grid-cols-[50px_1fr] items-center  whitespace-pre py-2">
    <div className="flex size-8 items-center justify-center">
      <Image
        src={icon}
        alt={title}
        className="max-h-full max-w-full"
        sizes="32px"
      />
    </div>
    <div>
      <strong>{title}:</strong>
      {content}
    </div>
  </li>
);

const Footer: React.FC<FooterProps> = ({locale}) => {
  const translation = translations[locale];
  const textColor = 'text-gray-200/80';
  const linkStyle = `${textColor} ml-2 font-bold`;

  return (
    <Section
      divider="top"
      as="footer"
      role="contentinfo"
      className={`min-h-[25rem] w-full items-start overflow-hidden bg-gray-800 px-6 py-8 md:px-8 lg:px-12 ${textColor}`}
    >
      <ul className="grid list-none grid-cols-1 gap-4 border-t border-gray-700 p-0">
        <FooterItem
          icon="https://cdn.shopify.com/s/files/1/0868/0462/7772/files/phone-flip-svgrepo-com_1.svg?v=1721456243"
          title={translation.phone}
          content={
            <a href="tel:+380980059236" className={linkStyle}>
              (098) 005-9236
            </a>
          }
        />
        <FooterItem
          icon="https://cdn.shopify.com/s/files/1/0868/0462/7772/files/time-svgrepo-com_1_1.svg?v=1721456153"
          title={translation.working_hours}
          content={translation.working_hours_details}
        />
        <FooterItem
          icon="https://cdn.shopify.com/s/files/1/0868/0462/7772/files/email-svgrepo-com_3.svg?v=1721455854"
          title="Email"
          content={
            <a href="mailto:info@informatica.com.ua" className={linkStyle}>
              info@informatica.com.ua
            </a>
          }
        />
        <FooterItem
          icon="https://cdn.shopify.com/s/files/1/0868/0462/7772/files/place-marker-svgrepo-com_2.svg?v=1721456036"
          title={translation.address}
          content={<span className="ml-2">{translation.address_details}</span>}
        />
      </ul>
    </Section>
  );
};

function FooterLink({item}: {item: ChildEnhancedMenuItem}) {
  if (item.to.startsWith('http')) {
    return (
      <a href={item.to} target={item.target} rel="noopener noreferrer">
        {item.title}
      </a>
    );
  }

  return (
    <Link to={item.to} target={item.target} prefetch="intent">
      {item.title}
    </Link>
  );
}

function FooterMenu({menu}: {menu?: EnhancedMenu}) {
  const styles = {
    section: 'grid gap-4',
    nav: 'grid gap-2 pb-6',
  };

  return (
    <>
      {(menu?.items || []).map((item) => (
        <section key={item.id} className={styles.section}>
          <Disclosure>
            {({open}) => (
              <>
                <Disclosure.Button className="text-left md:cursor-default">
                  <Heading className="flex justify-between" size="lead" as="h3">
                    {item.title}
                    {item?.items?.length > 0 && (
                      <span className="md:hidden">
                        <IconCaret direction={open ? 'up' : 'down'} />
                      </span>
                    )}
                  </Heading>
                </Disclosure.Button>
                {item?.items?.length > 0 ? (
                  <div
                    className={`${
                      open ? `h-fit max-h-48` : `max-h-0 md:max-h-fit`
                    } overflow-hidden transition-all duration-300`}
                  >
                    <Suspense data-comment="This suspense fixes a hydration bug in Disclosure.Panel with static prop">
                      <Disclosure.Panel static>
                        <nav className={styles.nav}>
                          {item.items.map((subItem: ChildEnhancedMenuItem) => (
                            <FooterLink key={subItem.id} item={subItem} />
                          ))}
                        </nav>
                      </Disclosure.Panel>
                    </Suspense>
                  </div>
                ) : null}
              </>
            )}
          </Disclosure>
        </section>
      ))}
    </>
  );
}
