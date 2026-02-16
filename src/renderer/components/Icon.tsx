interface IconProps {
  path: string;
  size?: number;
}

export default function Icon({ path, size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d={path} />
    </svg>
  );
}
