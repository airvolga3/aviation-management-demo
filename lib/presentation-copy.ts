// Display copy only. This never changes identities, URLs, source classification or values.
export function presentationText(text: string): string {
  return text
    .replace(/[Уу]чебн(?:ыми|ого|ому|ые|ой|ая|ое|ым|ый|ом|ую|ых)\s+/g, '')
    .replace(/ · демо/g, '')
    .replace(/DEMO-/g, '')
    .replace(/в сценарии/g, 'в расчёте')
    .replace(/в демо/g, 'в расчёте');
}
