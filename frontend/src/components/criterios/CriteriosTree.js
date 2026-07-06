import React from 'react';
import CriterioTreeNode from './CriterioTreeNode';
import { CRITERIO_LEVELS } from './constants';

function CriteriosTree({ dimensiones, onRefresh }) {
  const renderSubatributo = (sub, siblings, atributoId) => (
    <CriterioTreeNode
      key={sub.id}
      level={CRITERIO_LEVELS.SUBATRIBUTO}
      node={sub}
      siblings={siblings}
      parentId={atributoId}
      onRefresh={onRefresh}
    />
  );

  const renderAtributo = (atr, siblings, dimensionId) => {
    const subs = atr.subatributos || [];
    return (
      <CriterioTreeNode
        key={atr.id}
        level={CRITERIO_LEVELS.ATRIBUTO}
        node={atr}
        siblings={siblings}
        parentId={dimensionId}
        children={subs}
        onRefresh={onRefresh}
        renderChild={(sub) =>
          renderSubatributo(sub, subs, atr.id)
        }
      />
    );
  };

  const renderDimension = (dim) => {
    const atributosList = dim.atributos || [];
    return (
      <CriterioTreeNode
        key={dim.id}
        level={CRITERIO_LEVELS.DIMENSION}
        node={dim}
        siblings={dimensiones}
        parentId={dim.proyecto}
        children={atributosList}
        onRefresh={onRefresh}
        renderChild={(atr) =>
          renderAtributo(atr, atributosList, dim.id)
        }
      />
    );
  };

  return <div className="space-y-3">{dimensiones.map(renderDimension)}</div>;
}

export default CriteriosTree;
