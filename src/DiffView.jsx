import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import Delta from "quill-delta";

function DiffView() {
  const { id: documentId } = useParams();
  const [socket, setSocket] = useState();
  const [content, setContent] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(0);

  useEffect(() => {
    const s = io(import.meta.env.VITE_SOCKET_URL);
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket == null) return;
    socket.emit("get-document", documentId);
  }, [socket, documentId]);

  useEffect(() => {
    if (socket == null || historyItems.length === 0) return;
    const start = performance.now();
    const oldDelta = new Delta(historyItems[selectedItem + 1]?.data || []);
    const newDelta = new Delta(historyItems[selectedItem]?.data || []);
    var diff = oldDelta.diff(newDelta);
    for (var i = 0; i < diff.ops.length; i++) {
      var op = diff.ops[i];
      // if the change was an insertion
      if (op.hasOwnProperty("insert")) {
        // color it green
        op.attributes = {
          background: "#cce8cc",
          color: "#003700",
        };
      }
      // if the change was a deletion
      if (op.hasOwnProperty("delete")) {
        // keep the text
        op.retain = op.delete;
        delete op.delete;
        // but color it red and struckthrough
        op.attributes = {
          background: "#e8cccc",
          color: "#370000",
          strike: true,
        };
      }
    }
    const adjusted = oldDelta.compose(diff);
    console.log(diff, "diff");
    console.log(adjusted, "adjusted");
    setContent(adjusted);
    const end = performance.now();
    const renderTime = end - start;
    console.log(`Rendering time: ${renderTime} milliseconds`);
  }, [selectedItem, historyItems, socket]);

  useEffect(() => {
    if (socket == null) return;
    const handler = (history) => {
      const sortHistory = history.sort((a, b) => {
        return b.timestamp - a.timestamp;
      });
      setHistoryItems(sortHistory);
    };
    socket.emit("get-history", documentId);
    socket.on("load-history", handler);
    return () => {
      socket.off("load-history", handler);
    };
  }, [socket, documentId, selectedItem]);

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${month}月${day}日 ${hours}:${minutes}`;
  }

  return (
    <>
      <div className="sidebar">
        <h3>版本历史</h3>
        {historyItems.map((item, index) => (
          <div
            key={index}
            className={`sidebar-item ${
              index === selectedItem ? "selected" : ""
            }`}
            onClick={() => setSelectedItem(index)}
          >
            <div>
              {formatDate(item.timestamp)}{" "}
              {index === selectedItem ? " (当前版本)" : ""}
            </div>
            {item._id}
          </div>
        ))}
      </div>

      <div className="container">
        <ReactQuill
          value={content}
          readOnly={true}
          style={{ height: "100%" }}
          modules={{ toolbar: false }}
        />
      </div>
    </>
  );
}

export default DiffView;
