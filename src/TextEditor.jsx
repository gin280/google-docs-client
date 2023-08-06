import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useParams, useNavigate } from "react-router-dom";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import { v4 as uuidV4 } from "uuid";

const SAVE_INTERVAL_MS = 1000;
const TOOLBAR_OPTIONS = [
  [{ header: "1" }, { header: "2" }, { font: [] }],
  [{ size: ["small", false, "large", "huge"] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: [] }, { background: [] }],
  ["image"],
];

class CustomToolbar {
  constructor(quill, options) {
    console.info("CustomToolbar", quill, options);
    this.quill = quill;
    this.options = options;
    const toolbar = quill.getModule("toolbar");

    // Save status
    let saveStatusElement = document.createElement("span");
    saveStatusElement.id = "save-status";
    saveStatusElement.style.fontSize = "14px";
    saveStatusElement.style.color = "#444";
    saveStatusElement.style.marginRight = "10px";
    toolbar.container.appendChild(saveStatusElement);

    // Save template button
    let saveTemplateButton = document.createElement("span");
    saveTemplateButton.innerHTML = "保存为模板";
    saveTemplateButton.style.fontSize = "14px";
    saveTemplateButton.style.backgroundColor = "#f8f9fa";
    saveTemplateButton.style.border = "1px solid #ccc";
    saveTemplateButton.style.padding = "5px 10px";
    saveTemplateButton.style.marginRight = "10px";
    saveTemplateButton.style.cursor = "pointer";
    saveTemplateButton.onclick = () => this.saveTemplate();
    toolbar.container.appendChild(saveTemplateButton);

    // View history button
    let viewHistoryButton = document.createElement("span");
    viewHistoryButton.innerHTML = "历史记录";
    viewHistoryButton.style.fontSize = "14px";
    viewHistoryButton.style.backgroundColor = "#f8f9fa";
    viewHistoryButton.style.border = "1px solid #ccc";
    viewHistoryButton.style.padding = "5px 10px";
    viewHistoryButton.style.cursor = "pointer";
    viewHistoryButton.onclick = () => this.viewHistory();
    toolbar.container.appendChild(viewHistoryButton);
  }

  saveTemplate() {
    const templateId = uuidV4();
    const content = this.quill.getContents();

    this.options.socket.emit(
      "save-as-template",
      templateId,
      content,
      (success) => {
        if (success) {
          console.log("Saved as template");
          // 你还可以添加其他逻辑，例如通知用户保存成功
        } else {
          console.log("Failed to save as template");
          // 你还可以添加其他逻辑，例如通知用户保存失败
        }
      }
    );
  }

  viewHistory() {
    this.options.history.push(`/diff/${this.options.documentId}`);
  }
}

export default function TextEditor() {
  const { id: documentId } = useParams();
  const history = useNavigate();
  const [socket, setSocket] = useState();
  const [editorHtml, setEditorHtml] = useState("加载中...");
  const [saveStatus, setSaveStatus] = useState("");
  const quillRef = useRef(null);

  useEffect(() => {
    console.log(import.meta.env.VITE_SOCKET_URL, 'import.meta.env.VITE_SOCKET_URLL')
    const s = io(import.meta.env.VITE_SOCKET_URL);
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    const saveStatusElement = document.getElementById("save-status");
    if (saveStatusElement) {
      saveStatusElement.innerText = saveStatus;
    }
  }, [saveStatus]);


  useEffect(() => {
    if (socket == null) return

    const handler = delta => {
      console.info('receive-changes', delta)
      setEditorHtml(delta)
    }
    socket.on("receive-changes", handler)

    return () => {
      socket.off("receive-changes", handler)
    }
  }, [socket])

  useEffect(() => {
    if (socket == null) return;

    socket.once("load-document", (document) => {
      setEditorHtml(document);
    });
    // 获取Quill实例
    const quill = quillRef.current.getEditor();
    // 将光标设置为文档内容的长度
    quill.setSelection(quill.getLength(), quill.getLength());
    socket.emit("get-document", documentId);
  }, [socket, documentId]);

  const handleChange = (content, delta, source, editor) => {
    setEditorHtml(content);
    if (source !== "user") return;
    console.info('send-changes', content)
    socket.emit("send-changes", content);

    setSaveStatus("正在保存...");

    const saveDocument = () => {
      socket.emit(
        "save-document",
        {
          data: editor.getContents(),
          html: editor.getHTML(),
        },
        () => {
          setSaveStatus("已保存到云端");
        }
      );
    };

    clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(saveDocument, SAVE_INTERVAL_MS);

    document.getElementById("save-status").innerText = saveStatus;
  };
  if (socket) {
    Quill.register("modules/customToolbar", CustomToolbar);

    const modules = {
      toolbar: TOOLBAR_OPTIONS,
      customToolbar: { socket, history, documentId },
    };
    return (
      <>
        <div className="container">
          <ReactQuill
            ref={(el) => {
              quillRef.current = el;
            }}
            value={editorHtml}
            onChange={handleChange}
            modules={modules}
          />
        </div>
      </>
    );
  }
  return <div>正在连接...</div>;
}
