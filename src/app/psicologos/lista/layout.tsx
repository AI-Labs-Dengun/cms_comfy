// Layout específico para a página de lista de psicólogos
// A verificação de autorização já é feita pelo layout pai (PsicologosLayout)
export default function ListaPsicologosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
