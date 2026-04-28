// mypage/chats/page.tsx
"use client";

import React, {
  Suspense,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getMyChatRooms } from "../../../../src/lib/api";
import { MyChatRoom, MyChatRoomsResponse } from "../../../../src/types/chat";
import { useCafeChat } from "../../../../src/hooks/useCafeChat";
import { useDmChat } from "../../../../src/hooks/useDmChat";
import ChatMessageList from "../../../../src/components/chat/ChatMessageList";
import ChatMessageInput from "../../../../src/components/chat/ChatMessageInput";
import ChatSidebar from "../../../../src/components/chat/ChatSidebar";
import ProfileMiniPopup from "../../../../src/components/common/ProfileMiniPopup";
import { useEscapeKey } from "../../../../src/hooks/useEscapeKey";
import { usePrivateChatFlow } from "../../../../src/hooks/usePrivateChatFlow";
import { useAuth } from "../../../../src/contexts/AuthContext";

const ProfileIcon: React.FC<{ size?: string }> = ({ size = "w-8 h-8" }) => (
  <div
    className={`${size} rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0`}
  >
    <svg
      aria-hidden="true"
      focusable="false"
      data-prefix="fas"
      data-icon="user"
      className="w-5 h-5 text-gray-600"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 448 512"
    >
      <path
        fill="currentColor"
        d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z"
      />
    </svg>
  </div>
);

interface ChatRoomItemProps {
  room: MyChatRoom;
  isActive: boolean;
  onClick: () => void;
}

const ChatRoomItem: React.FC<ChatRoomItemProps> = ({
  room,
  isActive,
  onClick,
}) => {
  return (
    <div
      className={`
        ${isActive ? "bg-[#F5F5F5] border-r-4 border-[#6E4213]" : ""}
        p-4 border-b border-[#CDCDCD] hover:bg-gray-50 cursor-pointer transition duration-150
      `}
      onClick={onClick}
    >
      <div className="flex items-start">
        <ProfileIcon size="w-12 h-12" />
        <div className="ml-3 flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <h3
              className={`text-base font-semibold truncate ${
                isActive ? "text-[#6E4213]" : "text-gray-800"
              }`}
            >
              {room.displayName}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {room.memberCount}명
              </span>
              {room.unreadCount > 0 && (
                <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                  {room.unreadCount > 99 ? "99+" : room.unreadCount}
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500 truncate mt-1">
            {room.lastMessage}
          </p>
        </div>
      </div>
    </div>
  );
};

const ChatRoomList: React.FC<{
  chatRooms: MyChatRoom[];
  activeRoomId: number | null;
  onRoomClick: (roomId: number) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}> = ({ chatRooms, activeRoomId, onRoomClick, isLoading, error, onRetry }) => {
  return (
    <div className="w-full bg-white h-full overflow-y-auto">
      <h1 className="p-4 text-2xl font-bold border-b border-[#CDCDCD] text-gray-800">
        채팅방 목록
      </h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="text-gray-500">채팅방 목록을 불러오는 중...</div>
        </div>
      ) : error ? (
        <div className="p-4 text-center">
          <div className="text-red-500 mb-2">{error}</div>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            다시 시도
          </button>
        </div>
      ) : chatRooms.length === 0 ? (
        <div className="flex justify-center items-center h-32">
          <div className="text-gray-500">참여 중인 채팅방이 없습니다.</div>
        </div>
      ) : (
        chatRooms.map((room) => (
          <ChatRoomItem
            key={room.roomId}
            room={room}
            isActive={activeRoomId === room.roomId}
            onClick={() => onRoomClick(room.roomId)}
          />
        ))
      )}
    </div>
  );
};

const ChatRoomPanel: React.FC<{
  activeRoom: MyChatRoom;
  currentChat: any;
  onLeaveRoom: () => void;
  onBackToRoomList: () => void;
}> = ({ activeRoom, currentChat, onLeaveRoom, onBackToRoomList }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  const currentUserId = user?.id || "user-me";

  // 사이드바 닫기 핸들러
  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // 알림 상태를 토글하는 Handler
  const handleToggleNotification = () => {
    if (currentChat) {
      currentChat.toggleMute();
    }
  };

  // 메시지 전송 핸들러
  const handleSendMessage = async (message: string) => {
    if (currentChat) {
      await currentChat.sendMessage(message);
      if (typeof currentChat.refreshMessages === "function") {
        setTimeout(() => {
          currentChat.refreshMessages();
        }, 40);
      }
    }
  };

  // 메시지 리스트 영역 클릭 핸들러
  const handleListClick = () => {
    closeSidebar();
  };

  // 채팅방 나가기 핸들러
  const handleLeaveChat = async () => {
    if (window.confirm("정말로 이 채팅방을 나가시겠습니까?")) {
      try {
        await currentChat.leaveChat();
        onLeaveRoom();
      } catch (error) {
        console.error("채팅방 나가기 실패:", error);
      }
    }
  };

  // 사이드바 내 프로필 클릭 핸들러
  const handleSidebarProfileClick = (
    user: { id: string; name: string },
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.stopPropagation();
    closeSidebar();
  };

  // 프로필 클릭 핸들러 (단체 채팅에서만)
  const handleProfileClick = (
    senderId: string,
    senderName: string,
    event: React.MouseEvent<HTMLElement>
  ) => {};

  // 주의: useCafeChat/useDmChat 내부에서 이미 자동 입장 처리를 수행한다.
  // 여기서 joinChat을 다시 호출하면 방 입장 시 중복 요청/상태 루프가 생길 수 있어 비활성화한다.
  useEffect(() => {
    if (!activeRoom) return;
    if (currentChat.isJoined && !currentChat.isLoading) {
      const timer = setTimeout(() => {
        currentChat.markAsRead?.();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [
    activeRoom?.roomId,
    currentChat?.isJoined,
    currentChat?.isLoading,
    currentChat?.markAsRead,
  ]);

  return (
    <div className="flex-1 flex flex-col bg-white h-full relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-gray-200 p-4 rounded-t-xl z-10 shadow-sm bg-white">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          {activeRoom.displayName}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            className="xl:hidden text-gray-900 px-3 py-1 rounded-full border border-gray-200 text-sm"
            onClick={onBackToRoomList}
          >
            채팅방 목록
          </button>
          {/* 사이드바 토글 버튼 (햄버거 메뉴) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsSidebarOpen((prev) => !prev);
            }}
            className="text-gray-900 p-2 rounded-full transition duration-150"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              data-prefix="fas"
              data-icon="bars"
              className="w-5 h-5"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 448 512"
            >
              <path
                fill="currentColor"
                d="M16 132h416c8.837 0 16-7.163 16-16V76c0-8.837-7.163-16-16-16H16C7.163 60 0 67.163 0 76v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z"
              ></path>
            </svg>
          </button>
        </div>
      </header>

      {/* 로딩 상태 */}
      {currentChat.isLoading && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-gray-600">채팅방에 연결하는 중...</p>
          </div>
        </div>
      )}

      {/* 에러 상태 */}
      {currentChat.error && !currentChat.isLoading && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-2">오류 발생</h2>
            <p className="text-gray-600 mb-4">{currentChat.error}</p>
          </div>
        </div>
      )}

      {/* 정상 채팅 화면 */}
      {!currentChat.isLoading && !currentChat.error && (
        <>
          {/* ChatMessageList */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <ChatMessageList
                messages={currentChat.messages}
                chatHistory={currentChat.chatHistory}
                hasMoreHistory={currentChat.hasMoreHistory}
                isLoadingHistory={currentChat.isLoadingHistory}
                onLoadMoreHistory={currentChat.loadMoreHistory}
                onProfileClick={handleProfileClick}
                onListClick={handleListClick}
                onMarkAsRead={currentChat.markAsRead}
                roomId={currentChat.roomId || undefined}
              />
            </div>

            <ChatMessageInput
              onSendMessage={handleSendMessage}
              roomId={currentChat.roomId || undefined}
            />
          </div>
        </>
      )}

      {/* 사이드바 - 채팅방 오른쪽에 고정 */}
      {isSidebarOpen && (
        <>
          {/* 오버레이 */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeSidebar}
          />
          {/* 사이드바 */}
          <div className="absolute inset-0 z-50">
            <ChatSidebar
              participants={currentChat.participants}
              currentUserId={currentUserId}
              isNotificationOn={!currentChat.isMuted}
              onToggleNotification={handleToggleNotification}
              onClose={closeSidebar}
              onProfileClick={handleSidebarProfileClick}
              onLeave={handleLeaveChat}
              title="참여자 목록"
              subtitle="참여자"
            />
          </div>
        </>
      )}
    </div>
  );
};

const GroupChatRoomView: React.FC<{
  activeRoom: MyChatRoom;
  onLeaveRoom: () => void;
  onBackToRoomList: () => void;
}> = ({ activeRoom, onLeaveRoom, onBackToRoomList }) => {
  const cafeChat = useCafeChat({
    cafeId: activeRoom.cafeId?.toString() || "",
    cafeName: activeRoom.displayName || "",
    existingRoomId: activeRoom.roomId.toString(),
  });

  return (
    <ChatRoomPanel
      activeRoom={activeRoom}
      currentChat={cafeChat}
      onLeaveRoom={onLeaveRoom}
      onBackToRoomList={onBackToRoomList}
    />
  );
};

const DmChatRoomView: React.FC<{
  activeRoom: MyChatRoom;
  onLeaveRoom: () => void;
  onBackToRoomList: () => void;
}> = ({ activeRoom, onLeaveRoom, onBackToRoomList }) => {
  const dmChat = useDmChat({
    counterpartId: "",
    counterpartName: activeRoom.displayName || "",
    existingRoomId: activeRoom.roomId.toString(),
  });

  return (
    <ChatRoomPanel
      activeRoom={activeRoom}
      currentChat={dmChat}
      onLeaveRoom={onLeaveRoom}
      onBackToRoomList={onBackToRoomList}
    />
  );
};

const ChatRoomView: React.FC<{
  activeRoom: MyChatRoom | null;
  onLeaveRoom: () => void;
  onBackToRoomList: () => void;
}> = ({ activeRoom, onLeaveRoom, onBackToRoomList }) => {
  if (!activeRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">💬</div>
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            채팅방을 선택해주세요
          </h2>
          <p className="text-gray-500">
            왼쪽에서 채팅방을 클릭하여 대화를 시작하세요
          </p>
        </div>
      </div>
    );
  }

  if (activeRoom.type === "GROUP") {
    return (
      <GroupChatRoomView
        key={`group-${activeRoom.roomId}`}
        activeRoom={activeRoom}
        onLeaveRoom={onLeaveRoom}
        onBackToRoomList={onBackToRoomList}
      />
    );
  }

  return (
    <DmChatRoomView
      key={`dm-${activeRoom.roomId}`}
      activeRoom={activeRoom}
      onLeaveRoom={onLeaveRoom}
      onBackToRoomList={onBackToRoomList}
    />
  );
};

const ChatListPageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chatRooms, setChatRooms] = useState<MyChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [activeRoom, setActiveRoom] = useState<MyChatRoom | null>(null);

  // 채팅방 목록 로드
  const loadChatRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response: MyChatRoomsResponse = await getMyChatRooms();
      // 현재 활성화된 채팅방의 unreadCount는 0으로 유지
      const updatedRooms = response.data.content.map((room) => {
        if (activeRoomId && room.roomId === activeRoomId) {
          return { ...room, unreadCount: 0 };
        }
        return room;
      });

      setChatRooms(updatedRooms);
    } catch (err) {
      console.error("채팅방 목록 로드 실패:", err);
      setError(
        err instanceof Error ? err.message : "채팅방 목록을 불러올 수 없습니다."
      );
      setChatRooms([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeRoomId]);

  const handleRoomClick = (roomId: number) => {
    setActiveRoomId(roomId);
    const room = chatRooms.find((r) => r.roomId === roomId);

    if (!room) {
      console.error("채팅방을 찾을 수 없습니다:", roomId);
      return;
    }

    setActiveRoom(room);

    // 선택된 채팅방의 읽지 않은 메시지 개수를 0으로 업데이트
    if (room.unreadCount > 0) {
      setChatRooms((prevRooms) =>
        prevRooms.map((r) =>
          r.roomId === roomId ? { ...r, unreadCount: 0 } : r
        )
      );
    }

    // URL에 선택된 채팅방 ID 추가 (새로고침 시 상태 유지)
    const params = new URLSearchParams(searchParams);
    params.set("room", roomId.toString());
    router.replace(`/mypage/chats?${params.toString()}`, { scroll: false });
  };

  // URL 파라미터에서 채팅방 ID 읽기 (초기 로드 시에만)
  useEffect(() => {
    const roomParam = searchParams.get("room");
    if (roomParam && chatRooms.length > 0 && !activeRoom) {
      const roomId = parseInt(roomParam);
      const room = chatRooms.find((r) => r.roomId === roomId);
      if (room && activeRoomId !== roomId) {
        setActiveRoomId(roomId);
        setActiveRoom(room);
      }
    }
  }, [searchParams, chatRooms, activeRoom, activeRoomId]);

  useEffect(() => {
    loadChatRooms();

    // 과도한 폴링은 메인 스레드를 점유해 채팅 입력 시 렉/멈춤을 유발할 수 있다.
    // 채팅 화면에서는 완만하게 동기화한다.
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadChatRooms();
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [activeRoomId]); // activeRoomId 변경 시에도 새로고침

  useEffect(() => {
    const handler = () => {
      loadChatRooms();
    };
    window.addEventListener("demo-chat-updated", handler);
    return () => window.removeEventListener("demo-chat-updated", handler);
  }, [loadChatRooms]);

  const handleSelectRoom = (roomId: number) => {
    handleRoomClick(roomId);
  };

  const handleBackToRoomList = () => {
    setActiveRoom(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("room");
    const query = params.toString();
    router.replace(query ? `/mypage/chats?${query}` : "/mypage/chats", {
      scroll: false,
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] w-full bg-white">
      {/* 채팅방이 선택되지 않은 경우: 목록만 전체 화면에 표시 */}
      {!activeRoom ? (
        <div className="w-full h-full overflow-y-auto bg-white">
          <ChatRoomList
            chatRooms={chatRooms}
            activeRoomId={activeRoomId}
            onRoomClick={handleSelectRoom}
            isLoading={isLoading}
            error={error}
            onRetry={loadChatRooms}
          />
        </div>
      ) : (
        <div className="flex-1 flex h-full relative">
          <aside
            className="hidden xl:block w-80 flex-shrink-0 border-r border-gray-200 h-full overflow-y-auto bg-white"
          >
            <ChatRoomList
              chatRooms={chatRooms}
              activeRoomId={activeRoomId}
              onRoomClick={handleSelectRoom}
              isLoading={isLoading}
              error={error}
              onRetry={loadChatRooms}
            />
          </aside>

          {/* 오른쪽: 채팅방 */}
          <main className="flex-1 flex flex-col h-full bg-white relative">
            <ChatRoomView
              activeRoom={activeRoom}
              onLeaveRoom={() => {
                setActiveRoom(null);
                setActiveRoomId(null);
                loadChatRooms();
              }}
              onBackToRoomList={handleBackToRoomList}
            />
          </main>
        </div>
      )}
    </div>
  );
};

const ChatListPage = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#6E4213] border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">채팅 목록을 불러오는 중입니다.</p>
          </div>
        </div>
      }
    >
      <ChatListPageContent />
    </Suspense>
  );
};

export default ChatListPage;
