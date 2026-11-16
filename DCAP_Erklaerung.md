# Intel DCAP: Rollen, Nachrichtenfluss und Vertrauensmodell

## 1. Zweck und Einordnung

**Data Center Attestation Primitives (DCAP)** bezeichnet Intels Softwarebausteine und Zertifizierungsinfrastruktur zur Erzeugung und Prüfung von Attestierungsnachweisen für Intel SGX und Intel TDX. Remote Attestation ermöglicht einer entfernten Partei, kryptografisch abgesicherte Aussagen über eine Trusted Execution Environment (TEE) zu prüfen, bevor sie dieser beispielsweise einen Schlüssel anvertraut.

Bei SGX ist die geschützte Ausführungsumgebung eine Enclave; bei TDX eine geschützte virtuelle Maschine, die Trust Domain (TD). DCAP stellt hierfür unter anderem Quote-Erzeugung, Quote-Verifikation und den Zugriff auf Zertifikate und Verifikationsdaten bereit. Die anwendungsspezifische Entscheidung, welcher Software und welchen Sicherheitsständen vertraut wird, bleibt Aufgabe der jeweiligen Anwendung beziehungsweise ihrer Betreiber.

## 2. Wer kommuniziert mit wem?

| Rolle / Komponente | Aufgabe | Übermittelte Informationen |
|---|---|---|
| Attester | Plattform mit der nachzuweisenden TEE und den Komponenten zur Nachweiserzeugung | Sendet eine Quote an den Verifier |
| Quoting Enclave (QE), bei TDX TD QE | Prüft lokale Reports und erzeugt signierte Quotes | Liefert die Quote über die Host-Infrastruktur an die anfragende Anwendung |
| Verifier | Prüft Quote, Zertifikatskette, Sicherheitsstände und erwartete Identitäten | Erhält Quote und Verifikationsdaten; liefert ein Attestierungsergebnis |
| Relying Party | Entscheidet anhand des Ergebnisses über eine Aktion, etwa die Freigabe eines Schlüssels | Fordert Attestierung an und gibt gegebenenfalls Geheimnisse frei |
| Intel Provisioning Certification Service (PCS) | Liefert Zertifikate und signierte Verifikationsdaten | Stellt unter anderem PCK-Zertifikate, TCB-Informationen, Sperrlisten und QE-Identitätsinformationen bereit |
| Provisioning Certificate Caching Service (PCCS) | Hält Zertifikate und Verifikationsdaten lokal verfügbar | Vermittelt diese Daten an Plattform- und Verifikationskomponenten |

Verifier und Relying Party sind logische Rollen. Sie können in derselben Anwendung liegen oder als getrennte Dienste betrieben werden. Der nicht vertrauenswürdige Host kann Nachrichten transportieren, ohne selbst zur entscheidenden Vertrauensgrundlage zu werden.

## 3. Beispiel: Freigabe eines geheimen Schlüssels

Der folgende Ablauf beschreibt ein mögliches Anwendungsprotokoll auf Basis von DCAP. Insbesondere die Challenge, die Kanalbindung und die anschließende Schlüsselfreigabe müssen durch das Anwendungsprotokoll ausgestaltet werden.

1. **Relying Party → Attester:** Die anfragende Partei sendet eine frische, zufällige Challenge, etwa eine Nonce, und fordert einen Attestierungsnachweis an.
2. **Geschützte Anwendung → lokale Attestierungsmechanismen:** Die Anwendung erzeugt innerhalb der TEE ein Schlüsselpaar. Sie bindet den öffentlichen Schlüssel und die Challenge über einen Hash in das dafür vorgesehene Report-Datenfeld ein. Das Protokoll muss sicherstellen, dass der zugehörige private Schlüssel innerhalb der TEE verbleibt.
3. **TEE → Quoting-Infrastruktur:** Bei SGX wird ein lokaler Report für die QE erzeugt. Bei TDX entsteht ein TDREPORT unter Beteiligung des TDX-Moduls und der Hardware. Die Quoting-Infrastruktur lässt diesen lokalen Nachweis prüfen und erzeugt eine signierte Quote.
4. **Attester → Verifier:** Der Attester übermittelt die Quote. Sie enthält unter anderem Messwerte beziehungsweise Identitäts- und Konfigurationsangaben sowie die eingebundenen Report-Daten.
5. **PCS/PCCS → Verifier:** Der Verifier bezieht die notwendigen Zertifikate und Verifikationsdaten, sofern sie nicht bereits geeignet vorliegen. Er prüft Signaturen, Zertifikatsketten, Sperrinformationen, TCB-Status und QE-Identität. Zusätzlich muss die Anwendungsprüfung die erwarteten Messwerte, die Challenge und die Bindung an den öffentlichen Schlüssel kontrollieren.
6. **Verifier → Relying Party:** Bei getrennten Rollen erhält die Relying Party ein authentisiertes, hinreichend frisches Attestierungsergebnis. Sie entscheidet anhand ihrer Freigaberegeln, ob der nachgewiesene Zustand akzeptabel ist.
7. **Relying Party → geschützte Anwendung:** Erst nach erfolgreicher Prüfung wird der geheime Schlüssel über einen an den attestierten Schlüssel gebundenen, kryptografisch geschützten Kanal übertragen.

Die Quote allein verschlüsselt keine Anwendungsdaten. Die Bindung zwischen Attestierung und Kommunikationskanal verhindert, dass ein Angreifer einen gültigen Nachweis einer anderen TEE weiterreicht, die Geheimnisse anschließend aber selbst empfängt.

## 4. Worauf beruht das Vertrauen?

Die Quote wird mit einem Attestation Key der Quoting Enclave signiert. Dessen Vertrauenswürdigkeit wird über einen QE-Report und eine Zertifizierung mit dem **Provisioning Certification Key (PCK)** abgesichert. Die PCK-Zertifikatskette führt zu einer Intel-Vertrauenswurzel. Der Verifier benötigt deshalb eine unabhängig vertrauenswürdig bezogene Root sowie die relevanten Verifikationsdaten; eine beliebige, vom Attester mitgelieferte Root darf er nicht ungeprüft akzeptieren.

Die **Provisioning Certification Enclave (PCE)** spielt bei der Zertifizierung des Attestation Keys eine zentrale Rolle. Das bereitgestellte SoK-Paper hebt in Abschnitt 3.7 hervor, dass die PCE deshalb in der Betrachtung der Trusted Computing Base berücksichtigt werden muss. Die Autoren kritisieren eine TDX-TCB-Darstellung, die die QE einbezieht, die PCE jedoch auslässt.

Intel muss nicht jede einzelne Quote online prüfen: Die Prüfung kann beim Betreiber oder einem unabhängigen Verifikationsdienst erfolgen. Intel bleibt als Herausgeber von Zertifikaten und Sicherheitsinformationen Teil der Vertrauensgrundlage. Ein Zugriff auf PCS betrifft Zertifikate und Verifikationsdaten; die geheimen Nutzdaten werden im beschriebenen Protokoll direkt an die geschützte Anwendung übertragen.

## 5. Aussagekraft und Grenzen

Eine akzeptierte Attestierung besagt, dass der überprüfte Nachweis zu einer anerkannten Hardware-Vertrauenskette gehört und dass die nachgewiesenen Eigenschaften die festgelegten Prüfkriterien erfüllen. Sie beweist nicht, dass das Programm fehlerfrei ist oder sämtliche Seitenkanäle ausgeschlossen sind. Ebenso attestiert eine TDX-Quote nicht automatisch die Identität jedes Programms innerhalb einer VM: Dafür müssen Messkette und Prüfregeln die relevanten Softwarekomponenten tatsächlich abdecken.

Drei Prüfungen sind daher zu unterscheiden:

- **Kryptografische Gültigkeit:** Ist der Nachweis authentisch und unverändert?
- **Sicherheitsbewertung:** Sind Plattformzustand, Sicherheitsversionen und Verifikationsdaten akzeptabel?
- **Anwendungsentscheidung:** Entsprechen Softwareidentität und Konfiguration den Anforderungen für die konkrete Freigabe?

DCAP schafft damit eine Grundlage für überprüfbare Vertrauensentscheidungen über entfernte Ausführungsumgebungen. Die Sicherheit der anschließenden Nutzung hängt zusätzlich von geeigneten Prüfregeln, Aktualität und einem korrekt gebundenen Kommunikationsprotokoll ab.

## Quellen und Bezug zum bereitgestellten Paper

- Bereitgestelltes PDF *SoK: Attestation in CC*: Abschnitt 3.4.4 und Abbildung 5 (AK-Zertifizierung), Abschnitt 3.7 (TCB-Diskussion), Abschnitt 4 (SCONE), Anhang D und Abbildung 23 (SGX-DCAP-Vertrauenskette). Seitenangaben der PDF-Datei: insbesondere S. 4, 6 und 16.
- [Intel: DCAP ECDSA Orientation](https://www.intel.com/content/dam/develop/public/us/en/documents/intel-sgx-dcap-ecdsa-orientation.pdf): Komponenten der Quote-Verifikation und Caching von Verifikationsdaten.
- [Intel: TDX DCAP Quote Library API](https://download.01.org/intel-sgx/latest/dcap-latest/linux/docs/Intel_TDX_DCAP_Quoting_Library_API.pdf): Quote-Erzeugung und für die Verifikation benötigte Daten.
- [Intel: Trusted Computing Base Recovery](https://www.intel.com/content/www/us/en/developer/articles/technical/software-security-guidance/best-practices/trusted-computing-base-recovery.html): Zusammenspiel von Plattform, Zertifizierungsdiensten und Verifier.
