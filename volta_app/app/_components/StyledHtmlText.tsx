import React from 'react';
import { Text, type TextStyle } from 'react-native';

type StyledHtmlTextProps = {
  html: string;
  baseStyle?: TextStyle;
  color?: string;
};

/**
 * Convertește HTML simplu (<strong>, <b>, <em>, <i>, <p>, <br>, <ul>, <li>) în Text-uri React Native stilizate.
 * Reduce spațiile goale: mai multe newline-uri → maxim 2; trim la început/sfârșit.
 */
function parseAndRender(
  html: string,
  baseStyle: TextStyle,
  color: string,
  keyPrefix: string
): React.ReactNode[] {
  if (!html || typeof html !== 'string') return [];
  const nodes: React.ReactNode[] = [];
  let s = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  const re = /<(\/?)(strong|b|em|i)>|([^<]+)/gi;
  let match;
  const stack: Array<{ fontWeight?: string; fontStyle?: string }> = [];
  let key = 0;
  let textBuffer = '';

  const flush = () => {
    if (textBuffer.length === 0) return;
    const style = { ...baseStyle, color } as TextStyle;
    stack.forEach((s) => Object.assign(style, s));
    nodes.push(
      <Text key={`${keyPrefix}-${key++}`} style={style}>
        {textBuffer}
      </Text>
    );
    textBuffer = '';
  };

  while ((match = re.exec(s)) !== null) {
    if (match[3] !== undefined) {
      textBuffer += match[3];
      continue;
    }
    const closing = match[1] === '/';
    const tag = (match[2] || '').toLowerCase();
    if (closing) {
      flush();
      if (stack.length > 0) stack.pop();
    } else {
      flush();
      if (tag === 'strong' || tag === 'b') stack.push({ fontWeight: '700' });
      else if (tag === 'em' || tag === 'i') stack.push({ fontStyle: 'italic' });
    }
  }
  flush();
  return nodes;
}

export default function StyledHtmlText({ html, baseStyle = {}, color = '#666' }: StyledHtmlTextProps) {
  const nodes = parseAndRender(html, baseStyle, color, 'h');
  if (nodes.length === 0) return null;
  return <Text style={[baseStyle, { color }]}>{nodes}</Text>;
}
