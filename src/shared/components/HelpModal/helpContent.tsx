import type { PropsWithChildren } from "react";
import styles from "./HelpModal.module.css";

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

function P({ children }: PropsWithChildren) {
  return <p className={styles.paragraph}>{children}</p>;
}

function List({ items }: { items: string[] }) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function HelpContent() {
  return (
    <>
      <Section title="Tus saldos">
        <P>
          Manejás tres monedas al mismo tiempo — USD, EUR y ARS. Desde el Inicio podés ocultar/mostrar cada saldo
          por separado con el ícono del ojo, y ver el total convertido a la moneda que elijas.
        </P>
      </Section>

      <Section title="Depositar">
        <P>
          "Depositar" simula recibir dinero en tu cuenta (no es dinero real) — elegís moneda y monto, y el saldo
          se acredita al instante. Es la forma más rápida de tener con qué probar el resto de las operaciones.
        </P>
      </Section>

      <Section title="Comprar y vender">
        <List
          items={[
            "Comprar: elegís cuánto querés recibir de una moneda y con qué moneda pagás.",
            "Vender: elegís cuánto entregás de una moneda y qué moneda recibís a cambio.",
            "La tasa de cambio es real (no simulada) y se calcula justo al confirmar la operación.",
          ]}
        />
      </Section>

      <Section title="Intercambio">
        <P>
          Convertí saldo entre dos de tus propias monedas (por ejemplo, de USD a ARS) sin que intervenga nadie
          más — misma tasa real que Comprar/Vender.
        </P>
      </Section>

      <Section title="Transferir">
        <P>
          Enviale dinero a otra cuenta de Valora por alias, CVU o email. Antes de confirmar, siempre te mostramos
          el nombre completo y el documento de la persona para que verifiques que es quien esperás — si no
          coincide, cancelá y revisá el dato que escribiste.
        </P>
      </Section>

      <Section title="Actividad">
        <P>
          Todo tu historial de movimientos — depósitos, compras, ventas, intercambios y transferencias (con
          quién, cuándo y cuánto) — con filtros por tipo de operación.
        </P>
      </Section>

      <Section title="Tarjetas">
        <P>
          Tu tarjeta virtual Valora, con el número completo disponible para copiar cuando la revelás.
        </P>
      </Section>

      <Section title="Asistente Valora AI">
        <P>
          El botón flotante con forma de chat abre un asistente con IA para resolver dudas sobre tu cuenta y tus
          finanzas en general.
        </P>
      </Section>

      <Section title="Tu perfil">
        <P>
          Desde "Usuario" podés ver tu CVU y alias, y completar o editar tu celular, país y documento — algunas
          operaciones (comprar, vender, intercambiar, transferir) piden tener estos datos completos antes de
          dejarte operar.
        </P>
      </Section>
    </>
  );
}
