import { useState, type SubmitEvent } from "react";
import { Button } from "../Button/Button";
import { Input } from "../Input/Input";
import { Modal } from "../Modal/Modal";
import { PhoneNumberField } from "../PhoneNumberField/PhoneNumberField";
import { PHONE_COUNTRY_CODES, RESIDENCE_COUNTRY_CODES } from "../../constants";
import type { CountryCode } from "../../types/models";
import { useCompleteProfile } from "./useCompleteProfile";
import { useDocumentTypes } from "../../hooks/useDocumentTypes";
import { resolveE164Phone } from "../../utils/phone";
import { MAX_BIRTHDATE, toBackendDate } from "../../utils/date";
import styles from "./CompleteProfileModal.module.css";

const DEFAULT_PHONE_COUNTRY_CODE = PHONE_COUNTRY_CODES[0].code;
const DEFAULT_RESIDENCE_COUNTRY = RESIDENCE_COUNTRY_CODES[0].code as CountryCode;

export function CompleteProfileModal() {
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [country, setCountry] = useState<CountryCode>(DEFAULT_RESIDENCE_COUNTRY);
  const [du, setDu] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const { isSubmitting, error, submit } = useCompleteProfile();
  const documentTypes = useDocumentTypes();
  const documentLabel = documentTypes?.[country] ?? "Documento";

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(resolveE164Phone(phoneCountryCode, phoneLocal), country, du, toBackendDate(dateOfBirth));
  }

  return (
    <Modal isOpen onClose={() => {}} dismissible={false} ariaLabel="Completar perfil">
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2 className={styles.title}>Completá tu perfil</h2>
        <p className={styles.subtitle}>
          Necesitamos tu celular y tu documento para que puedas operar con tu billetera.
        </p>

        <Input
          id="profileDateOfBirth"
          label="Fecha de nacimiento"
          type="date"
          size="lg"
          value={dateOfBirth}
          onChange={(event) => setDateOfBirth(event.target.value)}
          autoComplete="bday"
          max={MAX_BIRTHDATE}
          className={styles.dateInput}
          required
        />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="profileCountry">País de residencia</label>
          <div className={styles.selectWrap}>
            <select
              id="profileCountry"
              className={styles.select}
              value={country}
              onChange={(event) => setCountry(event.target.value as CountryCode)}
            >
              {RESIDENCE_COUNTRY_CODES.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </select>
            <span className={`msym ${styles.selectIcon}`} aria-hidden="true">expand_more</span>
          </div>
        </div>

        <PhoneNumberField
          dialCodeSelectId="profileDialCode"
          localInputId="profilePhoneLocal"
          countryCode={phoneCountryCode}
          onCountryCodeChange={setPhoneCountryCode}
          local={phoneLocal}
          onLocalChange={setPhoneLocal}
          required
        />

        <Input
          id="profileDu"
          label={documentLabel}
          type="text"
          size="lg"
          placeholder="12345678"
          value={du}
          onChange={(event) => setDu(event.target.value)}
          autoComplete="off"
          icon="badge"
          pattern="[A-Za-z0-9]{5,15}"
          minLength={5}
          maxLength={15}
          required
        />

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className={styles.submitButton}>
          {isSubmitting ? "Guardando..." : "Completar perfil"}
        </Button>
      </form>
    </Modal>
  );
}
