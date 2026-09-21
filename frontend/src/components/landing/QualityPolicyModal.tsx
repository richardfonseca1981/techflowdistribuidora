import { Modal } from "./Modal";

export function QualityPolicyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Política de Qualidade">
      <div className="space-y-4 text-sm leading-relaxed text-[#64748B]">
        <p>
          A TechFlow Distribuidora tem o compromisso de fornecer óleo automotivo e lubrificantes que
          atendam às especificações técnicas indicadas por cada fabricante, buscando a satisfação e a
          confiança de todos os nossos clientes e parceiros.
        </p>
        <p>
          Trabalhamos para manter processos de armazenamento, manuseio e distribuição alinhados às
          boas práticas do setor, com atenção redobrada à integridade dos produtos desde o recebimento
          até a entrega final.
        </p>
        <p>
          Buscamos a melhoria contínua da nossa operação — revisando processos, ouvindo o retorno de
          clientes e acompanhando as exigências regulatórias do setor de distribuição de combustíveis
          e lubrificantes — como parte do nosso compromisso permanente com a qualidade.
        </p>
      </div>
    </Modal>
  );
}
