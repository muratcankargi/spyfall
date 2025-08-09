import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import * as Avatar from "@radix-ui/react-avatar";


export default function GameRoom() {
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const initialUsername = location.state?.username || localStorage.getItem("username") || "";
    const [username, setUsername] = useState(initialUsername);
    const [users, setUsers] = useState([]); // beklenen format: [{ id, username, avatarUrl? }, ...]
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
 const [isCopied, setIsCopied] = useState(false);
    const socketRef = useRef(null);

    // Basit hash -> renk fonksiyonu (aynı isme sabit renk üretir)
    const nameToColor = (name) => {
        if (!name) return "#CBD5E1"; // slate-300 fallback
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash;
        }
        const h = Math.abs(hash) % 360;
        return `hsl(${h}, 65%, 75%)`;
    };

    useEffect(() => {
        // Eğer username yoksa join form sayfasına yönlendir (oda kodu query ile)
        if (!username) {
            navigate(`/join-room?code=${roomId}`);
            return;
        }

        // localStorage'da sakla (yenileme sonrası kullanılmak üzere)
        localStorage.setItem("username", username);

        // socket oluştur
        const socket = io("http://localhost:5001", {
            transports: ["websocket", "polling"],
        });
        socketRef.current = socket;

        // connect olunca join at
        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            socket.emit("joinRoom", { roomId, username });
        });

        // Sunucudan gelen güncel liste
        socket.on("updateUserList", (list) => {
            // Güvenlik: listeyi beklenen formata zorla
            if (Array.isArray(list)) {
                setUsers(list.map(u => ({ id: u.id, username: u.username, avatarUrl: u.avatarUrl || null })));
            } else {
                setUsers([]);
            }
            setLoading(false);
        });

        socket.on("joinError", (payload) => {
            // örn. { message: "…" }
            setError(payload?.message || "Odaya katılırken hata oluştu.");
            // isteğe bağlı: yönlendir
            // navigate(`/join-room?${roomId}`);
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connect_error:", err);
            setError("Sunucuya bağlanırken hata: " + (err?.message || "bilinmeyen"));
            setLoading(false);
        });

        return () => {
            // leave ve disconnect cleanup
            if (socketRef.current) {
                try {
                    socketRef.current.emit("leaveRoom", { roomId, username });
                } catch (e) { }
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [roomId, username, navigate]);

    const copyLink = async () => {
        const link = `${window.location.origin}/rooms/${roomId}`;
        try {
            await navigator.clipboard.writeText(link);
            setError("");
            setIsCopied(true);

            // 2 saniye sonra eski haline döndür
            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        } catch (e) {
            setError("Link kopyalanamadı.");
        }
    };

    // Basit loader / hata gösterimi
    if (!username) return null; // navigate ile yönlendiriliyor
    if (error) {
        return (
            <div className="p-6 max-w-3xl mx-auto">
                <div className="bg-red-50 text-red-800 p-4 rounded">{error}</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold">Oda: <span className="text-indigo-600">{roomId}</span></h1>
                    <p className="text-sm text-gray-500">Hoş geldin, <span className="font-medium">{username}</span></p>
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

            <section>
                <h2 className="text-lg font-medium mb-4">Online Kullanıcılar</h2>

                {loading ? (
                    <div className="text-gray-500">Yükleniyor...</div>
                ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {users.length === 0 && (
                            <li className="col-span-full text-gray-500">Henüz kimse yok.</li>
                        )}

                        {users.map((player) => (
                            <li key={player.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex flex-col items-center text-center transform hover:scale-105 transition">
                                <Avatar.Root className="w-20 h-20 rounded-full overflow-hidden border-2" style={{ borderColor: "rgba(99,102,241,0.25)" }}>
                                    {player.avatarUrl ? (
                                        <Avatar.Image src={player.avatarUrl} alt={player.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <Avatar.Fallback
                                            className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-800"
                                            delayMs={200}
                                            style={{ backgroundColor: nameToColor(player.username) }}
                                        >
                                            {player.username ? player.username.charAt(0).toUpperCase() : "?"}
                                        </Avatar.Fallback>
                                    )}
                                </Avatar.Root>

                                <div className="mt-3">
                                    <div className="font-semibold text-gray-800">{player.username || "(isim yok)"}</div>
                                    <div className="mt-1 text-xl text-white">{player.username}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
