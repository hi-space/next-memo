import React from 'react';
import MarkdownPreview from '@uiw/react-markdown-preview';
import katex from 'katex';
import { useTheme } from '@mui/material/styles';

interface MarkdownContentProps {
  content: string;
}

// 코드 문자열을 가져오는 헬퍼 함수
const getCodeString = (children: any[]): string => {
  return children
    .map((child) => (child && child.props ? child.props.children : ''))
    .join('');
};

// MarkdownContent 컴포넌트
const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  const theme = useTheme();

  return (
    <MarkdownPreview
      source={content}
      style={{
        backgroundColor: theme.palette.background.paper,
        fontSize: theme.typography.body1.fontSize,
      }}
      components={{
        code: ({ children = [], className, ...props }) => {
          // $$ 수식 감지
          if (typeof children === 'string' && /^\$\$(.*)\$\$/.test(children)) {
            const html = katex.renderToString(
              children.replace(/^\$\$(.*)\$\$/, '$1'),
              {
                throwOnError: false,
              }
            );
            return (
              <code
                dangerouslySetInnerHTML={{ __html: html }}
                style={{
                  background: 'transparent',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              />
            );
          }

          // language-katex 코드 블록 감지
          const code =
            props.node && props.node.children
              ? getCodeString(props.node.children)
              : children;
          if (
            typeof code === 'string' &&
            typeof className === 'string' &&
            /^language-katex/.test(className.toLowerCase())
          ) {
            const html = katex.renderToString(code, {
              throwOnError: false,
            });
            return (
              <code
                style={{
                  fontSize: '150%',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          }

          // 기본 코드 블록 렌더링
          return (
            <code
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              className={String(className)}>
              {children}
            </code>
          );
        },
      }}
    />
  );
};

export default MarkdownContent;
