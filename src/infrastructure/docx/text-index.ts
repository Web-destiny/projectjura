import { DOMParser, XMLSerializer, type Document, type Element, type Node } from '@xmldom/xmldom';
export const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
export function xml(source: string): Document {
  if (/<!DOCTYPE|<!ENTITY/iu.test(source)) throw new Error('DTD и XML-сущности не поддерживаются.');
  return new DOMParser({
    onError: (level) => {
      if (level !== 'warning') throw new Error('Повреждённая XML-разметка DOCX.');
    },
  }).parseFromString(source, 'application/xml');
}
export const serialize = (doc: Document) => new XMLSerializer().serializeToString(doc);
export function ancestor(node: Node, name: string): boolean {
  for (let p = node.parentNode; p; p = p.parentNode)
    if (p.nodeType === 1 && (p as Element).namespaceURI === W && (p as Element).localName === name)
      return true;
  return false;
}
export interface Segment {
  node: Element;
  start: number;
  end: number;
}
export function indexParagraph(p: Element) {
  const segments: Segment[] = [];
  let text = '';
  function visit(node: Node) {
    if (node.nodeType === 1) {
      const e = node as Element;
      if (e !== p && e.namespaceURI === W && e.localName === 'p') return;
      if (e.namespaceURI === W && e.localName === 't') {
        const value = e.textContent || '';
        segments.push({ node: e, start: text.length, end: text.length + value.length });
        text += value;
        return;
      }
      if (e.namespaceURI === W && ['tab', 'br', 'cr'].includes(e.localName || '')) {
        text += e.localName === 'tab' ? '\t' : '\n';
        return;
      }
    }
    for (let c = node.firstChild; c; c = c.nextSibling) visit(c);
  }
  visit(p);
  return { text, segments };
}
export function editable(p: Element) {
  return (
    !ancestor(p, 'sdt') &&
    !ancestor(p, 'fldSimple') &&
    !ancestor(p, 'txbxContent') &&
    !ancestor(p, 'del') &&
    !ancestor(p, 'ins') &&
    !['fldChar', 'fldSimple', 'instrText', 'drawing', 'object', 'del', 'ins', 'sdt'].some(
      (n) => p.getElementsByTagNameNS(W, n).length > 0,
    )
  );
}
export function setText(node: Element, text: string) {
  node.textContent = text;
  node.setAttribute('xml:space', 'preserve');
}
export function replaceRange(p: Element, start: number, end: number, value: string) {
  const { segments, text } = indexParagraph(p);
  if (start < 0 || end > text.length || start >= end) throw new Error('Некорректный диапазон поля.');
  const touched = segments.filter((s) => s.start < end && s.end > start);
  if (
    !touched.length ||
    touched.reduce((n, s) => n + Math.min(end, s.end) - Math.max(start, s.start), 0) !== end - start
  )
    throw new Error('Поле пересекает табуляцию или разрыв строки. Выделите обычный текст внутри абзаца.');
  const first = touched[0],
    last = touched[touched.length - 1];
  const prefix = (first.node.textContent || '').slice(0, start - first.start);
  const suffix = (last.node.textContent || '').slice(end - last.start);
  for (const s of touched) setText(s.node, '');
  if (!/[\n\t]/u.test(value)) {
    setText(first.node, prefix + value + (first === last ? suffix : ''));
    if (first !== last) setText(last.node, suffix);
    return;
  }
  setText(first.node, prefix);
  const parent = first.node.parentNode!;
  const ref = first.node.nextSibling;
  const tokens = value.split(/([\n\t])/u);
  for (const token of tokens) {
    const e = p.ownerDocument!.createElementNS(W, token === '\n' ? 'w:br' : token === '\t' ? 'w:tab' : 'w:t');
    if (token !== '\n' && token !== '\t') setText(e, token);
    parent.insertBefore(e, ref);
  }
  if (first === last) {
    const e = p.ownerDocument!.createElementNS(W, 'w:t');
    setText(e, suffix);
    parent.insertBefore(e, ref);
  } else setText(last.node, suffix);
}
