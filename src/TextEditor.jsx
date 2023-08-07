import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useParams, useNavigate } from "react-router-dom";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import { v4 as uuidV4 } from "uuid";
import Delta from "quill-delta";
// import FollowButton from "./components/FollowButton";

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

    this.fetchTemplates();

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

    // Template dropdown
    let templateDropdown = document.createElement("select");
    templateDropdown.id = "template-dropdown";
    templateDropdown.onchange = (e) => this.insertTemplate(e.target.value);
    templateDropdown.style.fontSize = "12px";
    templateDropdown.style.backgroundColor = "#f8f9fa";
    templateDropdown.style.border = "1px solid #ccc";
    templateDropdown.style.padding = "5px 10px";
    templateDropdown.style.marginRight = "10px";
    templateDropdown.style.cursor = "pointer";
    toolbar.container.appendChild(templateDropdown);

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
    // 弹出一个对话框让用户输入模板名称
    const templateName = prompt("请输入模板名称:");

    if (templateName == null || templateName.trim() === "") {
      return;
    }

    const templateId = uuidV4();
    const content = this.quill.getContents();

    this.options.socket.emit(
      "save-as-template",
      templateId,
      content,
      templateName, // 将模板名称发送到服务器
      (success) => {
        if (success) {
          console.log("Saved as template");
          // 更新模板选择列表
          this.fetchTemplates();
          // 你还可以添加其他逻辑，例如通知用户保存成功
        } else {
          console.log("Failed to save as template");
          // 你还可以添加其他逻辑，例如通知用户保存失败
        }
      }
    );
  }

  viewHistory() {
    this.options.navigate(`/diff/${this.options.documentId}`);
  }

  // Fetch templates and populate dropdown
  fetchTemplates() {
    this.options.socket.emit("get-templates", (templates) => {
      console.log("Templates", templates);

      // 按创建日期排序，最新的在前面
      templates.sort((a, b) => b.timeStamp - a.timeStamp);

      let dropdown = document.getElementById("template-dropdown");

      // 清空下拉列表
      dropdown.innerHTML = "";

      // 创建一个 "请选择模板" 的选项
      let defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.innerText = "-请选择模板-";
      defaultOption.disabled = true;
      defaultOption.selected = true;
      // 将该选项添加到下拉列表的开头
      dropdown.appendChild(defaultOption);

      // 遍历模板并为每个模板添加一个选项
      templates.forEach((template) => {
        let option = document.createElement("option");
        option.value = template._id;
        option.innerText = template.name;
        dropdown.appendChild(option);
      });
    });
  }

  // Insert selected template
  insertTemplate(templateId) {
    this.options.socket.emit("get-template", templateId, (template) => {
      const cursorPosition = this.quill.getSelection(true).index;
      const currentContent = this.quill.getContents();
      const newContent = new Delta()
        .concat(currentContent.slice(0, cursorPosition))
        .concat(template.data)
        .concat(currentContent.slice(cursorPosition));
      this.quill.setContents(newContent, "user");
      // 将下拉列表设置回默认选项
      let dropdown = document.getElementById("template-dropdown");
      dropdown.value = ""; // 假设默认选项的值为 ""
    });
  }
}

export default function TextEditor() {
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState();
  const [editorHtml, setEditorHtml] = useState("加载中...");
  const [saveStatus, setSaveStatus] = useState("");
  const quillRef = useRef(null);
  const editorContainerRef = useRef(null);

  useEffect(() => {
    console.log(
      import.meta.env.VITE_SOCKET_URL,
      "import.meta.env.VITE_SOCKET_URLL"
    );
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
    if (socket == null) return;

    const handler = (delta) => {
      console.info("receive-changes", delta);
      setEditorHtml(delta);
    };
    socket.on("receive-changes", handler);

    return () => {
      socket.off("receive-changes", handler);
    };
  }, [socket]);

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
    console.info("send-changes", content);
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
      customToolbar: { socket, navigate, documentId },
    };
    return (
      <>
        <div className="container">
          {/* <FollowButton onClick={} label="插入模板" editorRef={editorContainerRef} /> */}
          <ReactQuill
            ref={(el) => {
              if (el != null) {
                quillRef.current = el;
                editorContainerRef.current = el.getEditor().container;
              }
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
