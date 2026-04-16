"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import ChatMessageInput from "@/components/chat/ChatMessageInput";
import { useParams, useRouter } from "next/navigation";
import ChatMessageList from "@/components/chat/ChatMessageList";
import ChatSidebar from "@/components/chat/ChatSidebar";
import { useDmChat } from "@/hooks/useDmChat";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivateChatFlow } from "@/hooks/usePrivateChatFlow";
import PrivateChatModal from "@/components/chat/PrivateChatModal";
import ProfileMiniPopup from "@/components/common/ProfileMiniPopup";

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

// 채팅방 목록은 목업 데이터 사용 (나중에 API로 교체 가능)
const DUMMY_CHAT_ROOMS = [
  {
    id: "private-1",
    displayName: "on",
    lastMessage: "!",
    isUnread: false,
    memberCount: 2,
  },
  {
    id: "private-2",
    displayName: "키이스케이프 강남점 채팅방",
    lastMessage: "2",
    isUnread: false,
    memberCount: 3,
  },
];

// 3.2 ChatRoomList
const ChatRoomList: React.FC<{
  activeRoomId: string;
  onRoomClick: (roomId: string) => void;
}> = ({ activeRoomId, onRoomClick }) => {
  return (
    <div className="w-full bg-white">
      <h1 className="p-4 text-2xl font-bold border-b border-[#CDCDCD] text-gray-800">
        채팅방 목록
      </h1>
      {DUMMY_CHAT_ROOMS.map((room) => (
        <div
          key={room.id}
          className={`
            ${
              room.id === activeRoomId
                ? "bg-[#F5F5F5] border-r-4 border-[#6E4213]"
                : ""
            }
            p-4 border-b border-[#CDCDCD] hover:bg-gray-50 cursor-pointer transition duration-150
          `}
          onClick={() => onRoomClick(room.id)}
        >
          <div className="flex items-start">
            <ProfileIcon size="w-12 h-12" />
            <div className="ml-3 flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <h3
                  className={`text-base font-semibold truncate ${
                    room.id === activeRoomId
                      ? "text-[#6E4213]"
                      : "text-gray-800"
                  }`}
                >
                  {room.displayName}
                </h3>
                {room.isUnread && (
                  <span className="w-2 h-2 ml-2 bg-red-500 rounded-full flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-gray-500 truncate mt-1">
                {room.lastMessage}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * URL: /mypage/chats/[roomId]
 * 역할: 채팅 목록과 상세 화면을 나란히 보여줍니다.
 */
const ChatDetailIntegratedPage: React.FC = () => {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  // 1. URL의 roomId를 초기 상태로 사용
  const initialChatId = params?.roomId ?? "";

  // 2. 현재 활성화된 채팅방 ID 상태 관리
  const [activeChatId, setActiveChatId] = useState(initialChatId);

  // 현재 사용자 정보
  const { user } = useAuth();
  const currentUserId = user?.id || "user-me";

  // 참여자 목록에서 상대방 찾기 (DM 채팅방이므로)
  const [counterpartId, setCounterpartId] = useState<string>("");
  const [counterpartName, setCounterpartName] = useState<string>("");

  // useDmChat 훅 사용 (existingRoomId로 마이페이지 채팅방 식별)
  const {
    roomId,
    isJoined,
    isLoading,
    error,
    participants,
    participantCount,
    messages,
    chatHistory,
    hasMoreHistory,
    isLoadingHistory,
    isMuted,
    stompConnected,
    joinChat,
    leaveChat,
    sendMessage,
    refreshParticipants,
    loadMoreHistory,
    toggleMute,
    markAsRead,
  } = useDmChat({
    counterpartId: counterpartId,
    counterpartName: counterpartName,
    existingRoomId: activeChatId, // 마이페이지에서 이미 존재하는 채팅방의 roomId
  });

  // 참여자 목록에서 상대방 찾기
  useEffect(() => {
    if (participants.length > 0 && user?.id) {
      const counterpart = participants.find((p) => p.id !== user.id);
      if (counterpart) {
        setCounterpartId(counterpart.id);
        setCounterpartName(counterpart.name);
      }
    }
  }, [participants, user?.id]);

  // 채팅방 이름 결정 (상대방 이름 또는 기본값)
  const chatRoomName = useMemo(() => {
    if (counterpartName) return counterpartName;
    if (participants.length === 2) {
      const other = participants.find((p) => p.id !== currentUserId);
      return other?.name || "1:1 채팅방";
    }
    return "1:1 채팅방";
  }, [counterpartName, participants, currentUserId]);

  const modalRef = useRef<HTMLDivElement>(null);
  const {
    targetUserForPopup,
    popupPosition,
    targetUserForPrivateChat,
    handleProfileClick,
    handleStartPrivateChat,
    closePrivateChatModal,
    closePopup,
  } = usePrivateChatFlow({}, modalRef, participants);

  // --- 핸들러 수정/추가 ---
  const handleRoomClick = useCallback((roomId: string) => {
    setActiveChatId(roomId);
  }, []);

  // 사이드바 닫기
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  // 메시지 리스트 영역 클릭 핸들러: 미니 팝업만 닫기
  const handleListClick = () => {
    closePopup();
  };

  // 메시지 전송 핸들러 (useDmChat의 sendMessage 사용)
  const handleSendMessage = useCallback(
    (message: string) => {
      sendMessage(message);
    },
    [sendMessage]
  );

  // 알림 상태를 토글하는 Handler (useDmChat의 toggleMute 사용)
  const handleToggleNotification = useCallback(() => {
    toggleMute();
  }, [toggleMute]);

  // 사이드바 내 프로필 클릭 시 동작
  const handleSidebarProfileClick = useCallback(
    (
      participant: { id: string; name: string },
      event: React.MouseEvent<HTMLDivElement>
    ) => {
      if (participant.id !== currentUserId) {
        handleProfileClick(
          participant.id,
          participant.name,
          event as React.MouseEvent<HTMLElement>
        );
        closeSidebar();
      }
    },
    [currentUserId, handleProfileClick, closeSidebar]
  );

  // 전체 영역 클릭 시 팝업 및 사이드바 닫기
  const handleOutsideClick = () => {
    closePopup();
    closeSidebar();
  };

  // 채팅방이 열릴 때 자동으로 참여
  useEffect(() => {
    if (activeChatId && !isJoined && !isLoading && !error) {
      joinChat();
    }
  }, [activeChatId, isJoined, isLoading, error, joinChat]);

  return (
    // 전체 컨테이너: 채팅 목록(왼쪽) + 상세 채팅(오른쪽)
    <div
      className="flex h-screen w-full overflow-hidden"
      onClick={handleOutsideClick}
    >
      <aside
        className="w-80 flex-shrink-0 border-r border-gray-200 h-full overflow-y-auto bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <ChatRoomList
          activeRoomId={activeChatId}
          onRoomClick={handleRoomClick}
        />
      </aside>
      <main className="flex-1 flex flex-col h-full bg-white relative">
        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6E4213] mx-auto mb-4"></div>
              <p className="text-gray-600">1:1 채팅방을 불러오는 중...</p>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold mb-2">1:1 채팅 시작 실패</h2>
              <p className="text-gray-600 mb-2">{error}</p>
              <button
                onClick={() => joinChat()}
                className="px-4 py-2 bg-[#6E4213] text-white rounded hover:bg-[#5a360f]"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        {/* 정상 채팅 화면 */}
        {!isLoading && !error && (
          <>
            {/* Header */}
            <header className="flex items-center justify-between border-gray-200 p-4 rounded-t-xl z-20 shadow-md bg-white sticky top-0 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-800 truncate max-w-[calc(100%-120px)]">
                {chatRoomName}
              </h2>
              <div className="flex items-center space-x-2">
                {/* 참여자 수 표시 */}
                <span className="text-sm font-medium text-gray-600 px-3 py-1 rounded-full bg-amber-50 flex items-center">
                  <ProfileIcon size="w-4 h-4" />
                  <span className="ml-1">{participantCount}</span>
                </span>
                {/* 사이드바 토글 버튼 (햄버거 메뉴) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closePopup();
                    setIsSidebarOpen((prev) => !prev);
                  }}
                  className="text-gray-600 p-2 rounded-full transition duration-150 hover:bg-gray-100"
                  aria-label="참여자 목록 열기"
                >
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    data-prefix="fas"
                    data-icon="bars"
                    className="h-6 w-6"
                    role="img"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 448 512"
                  >
                    <path
                      fill="currentColor"
                      d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"
                    />
                  </svg>
                </button>
              </div>
            </header>
            <div
              className="relative flex-grow overflow-y-auto"
              onClick={handleListClick}
            >
              {/* Chat Messages List */}
              <ChatMessageList
                messages={messages}
                chatHistory={chatHistory}
                hasMoreHistory={hasMoreHistory}
                isLoadingHistory={isLoadingHistory}
                onProfileClick={handleProfileClick}
                onListClick={handleListClick}
                onLoadMoreHistory={loadMoreHistory}
                onMarkAsRead={markAsRead}
                roomId={roomId || undefined}
              />
              {/* 1. 유저 프로필 팝업 */}
              {targetUserForPopup && popupPosition && (
                <ProfileMiniPopup
                  targetUserForPopup={targetUserForPopup}
                  popupPosition={popupPosition}
                  handleStartPrivateChat={handleStartPrivateChat}
                  closePopup={closePopup}
                />
              )}
            </div>
            {/* 메시지 입력 창 */}
            <ChatMessageInput
              onSendMessage={handleSendMessage}
              className="flex-shrink-0"
              roomId={roomId || undefined}
            />
            {/* 사이드바 영역 */}
            {isSidebarOpen && (
              <ChatSidebar
                participants={participants}
                currentUserId={currentUserId}
                isNotificationOn={!isMuted}
                onToggleNotification={handleToggleNotification}
                onClose={closeSidebar}
                onProfileClick={handleSidebarProfileClick}
                onLeave={async () => {
                  try {
                    await leaveChat();
                  } finally {
                    router.push("/mypage/chats");
                  }
                }}
                title="참여자 목록"
                subtitle="참여자"
              />
            )}
            {/* 2. 1:1 채팅 모달 */}
            {targetUserForPrivateChat && (
              <PrivateChatModal
                targetUser={targetUserForPrivateChat}
                onClose={closePrivateChatModal}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default ChatDetailIntegratedPage;
