interface IconProps {
  name: string;
  className?: string;
}

export function Icon({ name, className }: IconProps) {
  return (
    <svg className={className ? `icon ${className}` : "icon"}>
      <use href={`#icon-${name}`} />
    </svg>
  );
}
