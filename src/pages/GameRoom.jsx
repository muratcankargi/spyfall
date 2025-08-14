import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import * as Avatar from "@radix-ui/react-avatar";

export default function GameRoom() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const initialUsername =
    location.state?.username || localStorage.getItem("username") || "";
  const [username, setUsername] = useState(initialUsername);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [typesData, setTypesData] = useState([]); // backendden gelecek
  const [isOwner, setIsOwner] = useState(false);
  const socketRef = useRef(null);

  const nameToColor = (name) => {
    if (!name) return "#CBD5E1";
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 65%, 75%)`;
  };

  // Odaya ilk girişte backendden types verilerini çek
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await fetch(`http://localhost:5001/types`);
        console.log(res);
        if (!res.ok) throw new Error("Types verisi alınamadı");
        const data = await res.json();
        setTypesData(data);
      } catch (err) {
        console.error(err);
        setError("Types verisi alınırken hata oluştu.");
      }
    };
    fetchTypes();
  }, [roomId]);

  useEffect(() => {
    if (!username) {
      navigate(`/join-room?code=${roomId}`);
      return;
    }

    localStorage.setItem("username", username);

    const socket = io("http://localhost:5001", {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinRoom", { roomId, username });
    });

    socket.on("updateUserList", (list) => {
      setUsers(
        Array.isArray(list)
          ? list.map((u) => ({
              id: u.id,
              username: u.username,
              avatarUrl: u.avatarUrl || null,
            }))
          : []
      );
      setLoading(false);
    });

    socket.on("joinError", (payload) => {
      setError(payload?.message || "Odaya katılırken hata oluştu.");
    });

    socket.on("roomOwner", (ownerName) => {
      setIsOwner(ownerName === username);
    });

    // Sunucudan güncellenmiş types verisi al
    socket.on("typesUpdated", (data) => {
      setTypesData(data);
    });

    socket.on("connect_error", (err) => {
      setError("Sunucuya bağlanırken hata: " + (err?.message || "bilinmeyen"));
      setLoading(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leaveRoom", { roomId, username });
        socketRef.current.disconnect();
      }
    };
  }, [roomId, username, navigate]);

  const copyLink = async () => {
    const link = `${window.location.origin}/rooms/${roomId}`;
    try {
      await navigator.clipboard.writeText(link);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setError("Link kopyalanamadı.");
    }
  };

  const toggleWord = (title, word) => {
    if (!isOwner) return;
    const updated = typesData.map((t) =>
      t.title === title
        ? {
            ...t,
            type: t.type.map((w) =>
              w.name === word.name ? { ...w, selected: !w.selected } : w
            ),
          }
        : t
    );
    setTypesData(updated);
    socketRef.current.emit("updateTypes", { roomId, updated });
  };

  const toggleTitle = (title) => {
    if (!isOwner) return;
    const updated = typesData.map((t) =>
      t.title === title ? { ...t, selected: !t.selected } : t
    );
    setTypesData(updated);
    socketRef.current.emit("updateTypes", { roomId, updated });
  };

  if (!username) return null;
  if (error)
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-red-50 text-red-800 p-4 rounded">{error}</div>
      </div>
    );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">
            Oda: <span className="text-indigo-600">{roomId}</span>
          </h1>
          <p className="text-sm text-gray-500">
            Hoş geldin, <span className="font-medium">{username}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={copyLink}
            className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition"
          >
            {isCopied ? "Kopyalandı!" : "Oda Linkini Kopyala"}
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            Ana Sayfa
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kullanıcı listesi */}
        <section>
          <h2 className="text-lg font-medium mb-4">Online Kullanıcılar</h2>
          {loading ? (
            <div className="text-gray-500">Yükleniyor...</div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {users.length === 0 ? (
                <li className="col-span-full text-gray-500">
                  Henüz kimse yok.
                </li>
              ) : (
                users.map((player) => (
                  <li
                    key={player.id}
                    className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center text-center"
                  >
                    <Avatar.Root
                      className="w-20 h-20 rounded-full overflow-hidden border-2"
                      style={{
                        borderColor: "rgba(99,102,241,0.25)",
                      }}
                    >
                      {player.avatarUrl ? (
                        <Avatar.Image
                          src={player.avatarUrl}
                          alt={player.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Avatar.Fallback
                          className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-800"
                          delayMs={200}
                          style={{
                            backgroundColor: nameToColor(player.username),
                          }}
                        >
                          {player.username.charAt(0).toUpperCase()}
                        </Avatar.Fallback>
                      )}
                    </Avatar.Root>
                    <div className="mt-3 font-semibold text-gray-800">
                      {player.username}
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </section>

        {/* Kelime seçme */}
        <section>
          <h2 className="text-lg font-medium mb-4">Oyun Kelimeleri</h2>
          {typesData.length === 0 ? (
            <p className="text-gray-500">Veriler yükleniyor...</p>
          ) : (
            <div className="space-y-6">
              {typesData.map((category) => (
                <div
                  key={category.title}
                  className="border rounded-lg p-4 shadow-sm bg-white"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={category.selected !== false}
                      onChange={() => toggleTitle(category.title)}
                      disabled={!isOwner}
                    />
                    <span
                      className={`font-semibold ${
                        category.selected === false
                          ? "line-through text-gray-400"
                          : ""
                      }`}
                    >
                      {category.title}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {category.type.map((word) => (
                      <label
                        key={word}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          checked={word.selected !== false}
                          onChange={() => toggleWord(category.title, word)}
                          disabled={!isOwner}
                        />
                        <span
                          className={
                            word.selected === false
                              ? "line-through text-gray-400"
                              : "text-gray-800"
                          }
                        >
                          {word}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
