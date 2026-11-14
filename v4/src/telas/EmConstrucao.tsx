export function EmConstrucao({ titulo, etapa }: { titulo: string; etapa?: string }) {
  return (
    <div className="vazio-tela">
      <h2>{titulo}</h2>
      <p>Esta tela chega na etapa <strong>{etapa}</strong> do PMO v3. Enquanto isso, use o app atual.</p>
      <a className="bt bt-secundario" href="../">Abrir o app atual</a>
    </div>
  );
}

export function NaoEncontrada({ caminho }: { caminho: string }) {
  return (
    <div className="vazio-tela">
      <h2>Endereço não encontrado</h2>
      <p>O link <code>#/{caminho}</code> não existe ou está incompleto.</p>
      <a className="bt bt-primario" href="#/inicio">Ir para o início</a>
    </div>
  );
}
