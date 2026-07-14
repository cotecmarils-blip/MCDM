import React from 'react';

/** Logos en `frontend/public` (build copia a la raíz del static host). */
export const LOGO_ENAP = `${process.env.PUBLIC_URL}/Logo_ENAP.png`;
export const LOGO_COTECMAR = `${process.env.PUBLIC_URL}/CotecmarLogo.png`;
export const LOGO_CUC = `${process.env.PUBLIC_URL}/Logo_CUC.png`;

/**
 * Fila ENAP · Cotecmar · CUC.
 * @param {'brand'|'light'|'dark'} tone
 *  - brand: panel navy del login (ENAP/Cotecmar en blanco; CUC en rojo)
 *  - light: fondos claros (colores de marca)
 *  - dark: tema oscuro del sidebar (ENAP/Cotecmar claros; CUC en rojo)
 */
function BrandLogos({ tone = 'light', className = '', size = 'md' }) {
  const sizes = {
    sm: {
      enap: 'h-8 max-h-8 max-w-[2.75rem]',
      cotecmar: 'h-8 max-h-8 max-w-[7rem]',
      cuc: 'h-8 max-h-8 max-w-[5.5rem]',
      gap: 'gap-3',
    },
    md: {
      enap: 'h-10 max-h-10 max-w-[3.5rem]',
      cotecmar: 'h-10 max-h-10 max-w-[8rem]',
      cuc: 'h-10 max-h-10 max-w-[6.5rem]',
      gap: 'gap-4 sm:gap-5',
    },
  };
  const s = sizes[size] || sizes.md;

  const monoOnDark =
    tone === 'brand' || tone === 'dark'
      ? 'brightness-0 invert opacity-90'
      : 'opacity-90';
  const cucClass =
    tone === 'brand' || tone === 'dark'
      ? 'opacity-95'
      : 'opacity-90';

  const divider =
    tone === 'brand'
      ? 'hidden h-7 w-px bg-white/20 sm:block'
      : 'hidden h-6 w-px bg-gray-300 dark:bg-navy-600 sm:block';

  return (
    <div className={`flex items-center justify-center ${s.gap} ${className}`}>
      <img
        src={LOGO_ENAP}
        alt="ENAP"
        className={`${s.enap} w-auto object-contain ${monoOnDark}`}
      />
      <span className={divider} aria-hidden />
      <img
        src={LOGO_COTECMAR}
        alt="Cotecmar"
        className={`${s.cotecmar} w-auto object-contain ${monoOnDark}`}
      />
      <span className={divider} aria-hidden />
      <img
        src={LOGO_CUC}
        alt="Universidad de la Costa"
        className={`${s.cuc} w-auto object-contain ${cucClass}`}
      />
    </div>
  );
}

export default BrandLogos;
