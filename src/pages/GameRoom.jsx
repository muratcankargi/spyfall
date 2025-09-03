import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import * as Avatar from "@radix-ui/react-avatar";
import GamePlay from "./GamePlay";

export default function GameRoom() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const initialUsername =
    location.state?.username || localStorage.getItem("username") || "";
  const [username] = useState(initialUsername);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [typesData, setTypesData] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameData, setGameData] = useState(null);
  const socketRef = useRef(null);
  const API_URL = process.env.REACT_APP_API_URL;

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

  useEffect(() => {
    if (!username) {
      navigate(`/join-room?code=${roomId}`);
      return;
    }
    const fetchTypes = async () => {
      try {
        const res = await fetch(`${API_URL}/types`);
        if (!res.ok) throw new Error("Types verisi alınamadı");
        const data = await res.json();

        setTypesData(data);
      } catch (err) {
        console.error(err);
        setError("Types verisi alınırken hata oluştu.");
      }
    };
    fetchTypes();
  }, [roomId, API_URL, navigate, username]);

  useEffect(() => {
    if (!username) {
      navigate(`/join-room?code=${roomId}`);
      return;
    }

    localStorage.setItem("username", username);

    const socket = io(`${API_URL}`, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinRoom", { roomId, username });
    });

    socket.on("updateUserList", (list) => {
      setUsers(list.map(u => ({
        id: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl || null
      })));
      setLoading(false);
    });

    socket.on("joinError", (payload) => {
      setError(payload?.message || "Odaya katılırken hata oluştu.");
    });

    socket.on("roomOwner", (payload) => {
      setIsOwner(!!payload?.isOwner);
    });

    socket.on("typesUpdated", (data) => {
      const normalized = Array.isArray(data)
        ? data.map((cat) => ({
          title: cat.title,
          selected: cat.selected !== false,
          type: (cat.type || []).map((w) =>
            typeof w === "string"
              ? { name: w, selected: true }
              : { name: w.name, selected: w.selected !== false }
          ),
        }))
        : [];
      setTypesData(normalized);
    });

    socket.on("connect_error", (err) => {
      setError("Sunucuya bağlanırken hata: " + (err?.message || "bilinmeyen"));
      setLoading(false);
    });
    socket.on("gameStarted", () => setGameStarted(true));

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leaveRoom", { roomId, username });
        socketRef.current.disconnect();
      }
    };
  }, [roomId, username, navigate, API_URL]);

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on("updateTypes", ({ updated }) => {
      setTypesData(updated);
    });

    return () => {
      socketRef.current.off("updateTypes");
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on("gameStarted", (data) => {
      if (!data) return;
      setGameData(data);
      setGameStarted(true);
    });
  }, []);

  const copyLink = async () => {
    const link = `${window.location.origin}/join-room?code=${roomId}`;
    try {
      await navigator.clipboard.writeText(link);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setError("Link kopyalanamadı.");
    }
  };

  const toggleWord = (title, wordName) => {
    if (!isOwner) return;
    const updated = typesData.map((t) =>
      t.title === title
        ? {
          ...t,
          type: t.type.map((w) =>
            w.name === wordName ? { ...w, selected: !w.selected } : w
          ),
        }
        : t
    );
    setTypesData(updated);
    socketRef.current.emit("updateTypes", { roomId, updated });
  };

  const toggleTitle = (title) => {
    if (!isOwner) return;
    const updated = typesData.map((t) => {
      if (t.title === title) {
        const newSelected = !t.selected;
        return {
          ...t,
          selected: newSelected,
          type: t.type.map((w) => ({
            ...w,
            selected: newSelected,
          })),
        };
      }
      return t;
    });

    setTypesData(updated);
    socketRef.current.emit("updateTypes", { roomId, updated });
  };

  const startGame = () => {
    if (!typesData || typesData.length === 0 || users.length === 0) return;

    const selectedWords = [];
    typesData.forEach(cat =>
      cat.type.forEach(w => {
        if (w.selected) selectedWords.push(w.name);
      })
    );

    if (selectedWords.length === 0) return;

    socketRef.current.emit("startGame", {
      roomId,
      words: selectedWords,
    });

  };


  if (!username) return null;
  if (error)
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-red-50 text-red-800 p-4 rounded">{error}</div>
      </div>
    );
  if (gameStarted && gameData) {
    return (
      <GamePlay
        username={username}
        users={users}
        roomId={roomId}
        gameData={gameData}
        isOwner={isOwner}
        onBackToRoom={() => {
          setGameStarted(false);
          setGameData(null);
        }}
      />
    );
  }
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
            {isCopied ? "Kopyalandı!" : "Davet Linkini Kopyala"}
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            Ana Sayfa
          </button>
        </div>
        <div className="flex items-center gap-3">
          {isOwner && !gameStarted && (
            <button
              onClick={startGame}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Oyunu Başlat
            </button>
          )}
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

                  < li
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

        <section>
          <h2 className="text-lg font-medium mb-4">Oyun Kelimeleri</h2>
          {!isOwner && (
            <span className="text-xs text-gray-500">
              (Yalnızca oda sahibi düzenleyebilir)
            </span>
          )}
          {typesData.length === 0 ? (
            <p className="text-gray-500">Veriler yükleniyor...</p>
          ) : (
            <div className="space-y-6">
              {typesData.map((category, index) => (
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
                      className={`font-semibold ${category.selected === false ? "line-through text-gray-400" : ""
                        }`}
                    >
                      {category.title}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 mb-3">
                    {category.type.map((word) => (
                      <label key={word.name} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={word.selected !== false}
                          onChange={() => toggleWord(category.title, word.name)}
                          disabled={!isOwner}
                        />
                        <span
                          className={
                            word.selected === false
                              ? "line-through text-gray-400"
                              : "text-gray-800"
                          }
                        >
                          {word.name}
                        </span>
                      </label>
                    ))}
                  </div>
                  {isOwner && index === typesData.length - 1 && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        placeholder="Yeni kelime ekle..."
                        className="border rounded px-2 py-1 flex-1 text-sm"
                        value={category.newWord || ""}
                        onChange={(e) => {
                          setTypesData((prev) =>
                            prev.map((t) =>
                              t.title === category.title
                                ? { ...t, newWord: e.target.value }
                                : t
                            )
                          );
                        }}
                      />
                      <button
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                        onClick={() => {
                          if (!category.newWord?.trim()) return;
                          const updated = typesData.map((t) =>
                            t.title === category.title
                              ? {
                                ...t,
                                type: [
                                  ...t.type,
                                  { name: category.newWord.trim(), selected: true },
                                ],
                                newWord: "",
                              }
                              : t
                          );
                          setTypesData(updated);
                          socketRef.current.emit("updateTypes", { roomId, updated });
                        }}
                      >
                        Ekle
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div >
  );
}
