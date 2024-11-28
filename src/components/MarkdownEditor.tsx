import React from 'react';
import MdEditor from 'react-markdown-editor-lite';
import MarkdownIt from 'markdown-it';
import 'react-markdown-editor-lite/lib/index.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (text: string) => void;
  height?: string;
}

const mdParser = new MarkdownIt();

// Markdown을 HTML로 렌더링하는 함수
const renderMarkdown = (text: string) => {
  try {
    // Markdown 파싱
    return mdParser.render(text);
  } catch (error) {
    // console.error('Markdown 렌더링 에러:', error);
    // 에러 발생 시 텍스트 그대로 반환
    return `<pre>${text}</pre>`;
  }
};

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  height = '300px',
}) => {
  // 에디터 내용이 변경될 때 호출되는 함수
  const handleEditorChange = ({ text }: { text: string }) => {
    onChange(text);
  };

  return (
    <MdEditor
      value={value}
      style={{ height }}
      renderHTML={renderMarkdown}
      onChange={handleEditorChange}
      config={{
        view: {
          menu: true, // 메뉴 표시
          md: true, // Markdown 입력 뷰 활성화
          html: false, // HTML 미리보기 비활성화
        },
      }}
    />
  );
};

export default MarkdownEditor;
