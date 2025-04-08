import { useDraggable } from '@dnd-kit/core';

type DraggableProps = {
  children: React.ReactNode;
  disabled?: boolean;
  id: string;
  onClick?: () => void;
  staticStyle?: React.CSSProperties;
};

export const Draggable: React.FC<DraggableProps> = ({
  children,
  disabled,
  id,
  onClick,
  staticStyle,
}): JSX.Element => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
  });
  const style =
    transform && !disabled
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          zIndex: 100,
        }
      : staticStyle;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      ref={disabled ? undefined : setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
    >
      {children}
    </button>
  );
};
