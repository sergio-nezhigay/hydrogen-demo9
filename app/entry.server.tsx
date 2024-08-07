import type {AppLoadContext, EntryContext} from '@shopify/remix-oxygen';
import {RemixServer} from '@remix-run/react';
import isbot from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {createContentSecurityPolicy} from '@shopify/hydrogen';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  context: AppLoadContext,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    scriptSrc: [
      "'self'",
      'https://cdn.shopify.com',

      'https://*.googletagmanager.com',
    ],
    imgSrc: [
      "'self'",
      'https://cdn.shopify.com',
      'https://*.google-analytics.com',
      'https://*.googletagmanager.com',
    ],
    connectSrc: [
      "'self'",
      'https://analytics.google.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://*.googletagmanager.com',
    ],
    //scriptSrc: [
    //  "'self'",
    //  'https://cdn.shopify.com',
    //  'https://*.googletagmanager.com',
    //  'https://www.googletagmanager.com',
    //  'https://td.doubleclick.net',
    //  'https://analytics.google.com',
    //  'https://googleads.g.doubleclick.net',
    //],
    //imgSrc: [
    //  "'self'",
    //  'https://cdn.shopify.com',
    //  'https://www.google.com',
    //  'https://www.google.com.ua',
    //  'https://www.googletagmanager.com',
    //],
    //connectSrc: [
    //  "'self'",
    //  'https://analytics.google.com',
    //  'https://stats.g.doubleclick.net',
    //  'https://monorail-edge.shopifysvc.com',
    //  'https://googleads.g.doubleclick.net',
    //  'https://cdn.shopify.com',
    //],
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <RemixServer context={remixContext} url={request.url} />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        // eslint-disable-next-line no-console
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
