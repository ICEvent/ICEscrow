import React, { useEffect, useState } from 'react';
import { useOneblock } from './Store';

interface PrincipalNameProps {
  principal: { toString(): string } | string;
}

const truncate = (p: string): string =>
  p.length > 10 ? `${p.slice(0, 5)}...${p.slice(-5)}` : p;

const PrincipalName: React.FC<PrincipalNameProps> = ({ principal }) => {
  const oneblock = useOneblock();
  const [name, setName] = useState<string | null>(null);
  const principalText = typeof principal === 'string' ? principal : principal.toString();

  useEffect(() => {
    if (!oneblock || !principalText) return;
    oneblock.getProfileByPrincipal(principalText).then(res => {
      if (res[0]) setName(res[0].name);
    }).catch(() => {});
  }, [oneblock, principalText]);

  return <>{name || truncate(principalText)}</>;
};

export default PrincipalName;
