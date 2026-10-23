// Al posto di confirm(): nell'app Capacitor mostra i pulsanti in inglese (CANCEL/OK).

/** Chiede conferma con un <dialog> modale; risolve true solo se si tocca il pulsante di conferma. */
export function conferma(testo: string, si = 'Sì', no = 'Annulla'): Promise<boolean> {
  const d = document.createElement('dialog');
  d.className = 'conferma';
  d.innerHTML = '<p></p><form method="dialog"><button class="btn" value="no"></button><button class="btn btn-scelta" value="si"></button></form>';
  d.querySelector('p')!.textContent = testo;
  const [bNo, bSi] = d.querySelectorAll('button');
  bNo.textContent = no;
  bSi.textContent = si;
  document.body.append(d);
  d.showModal();
  return new Promise((risolvi) =>
    d.addEventListener('close', () => {
      risolvi(d.returnValue === 'si');
      d.remove();
    }),
  );
}
