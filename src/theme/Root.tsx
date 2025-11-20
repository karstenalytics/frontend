import React from 'react';
import type { Props } from '@theme/Root';
import SocialFooter from '@site/src/components/SocialFooter';

export default function Root({ children }: Props): React.ReactElement {
  return (
    <>
      {children}
      <SocialFooter />
    </>
  );
}
