import {useLocation} from '@remix-run/react';
import clsx from 'clsx';

import {UkrFlag} from '~/components/Icon';
import {useTranslation} from '~/lib/utils';

function LangSelector() {
  const location = useLocation();
  const currentUrl = `${location.pathname}${location.search}`;

  const {locale} = useTranslation();
  const bgClass = 'rounded-md size-8 flex-center';

  return (
    <ul className="flex-center">
      <li className="px-2">
        {locale === 'ru' ? (
          <a
            href={currentUrl.replace('/ru', '')}
            className="flex-center gap-2 group"
          >
            <UkrFlag />
            <span className={clsx('group-hover:bg-stone-100/20', bgClass)}>
              UA
            </span>
          </a>
        ) : (
          <span className="flex-center gap-2 text-gray-50/50">
            <UkrFlag />
            <span className={bgClass}>UA</span>
          </span>
        )}
      </li>
      <li className="border-l px-2">
        {locale === 'uk' ? (
          <a
            href={'/ru' + currentUrl}
            className={clsx('hover:bg-stone-100/20', bgClass)}
          >
            RU
          </a>
        ) : (
          <span className={clsx('text-gray-50/50', bgClass)}>RU</span>
        )}
      </li>
    </ul>
  );
}

export default LangSelector;
