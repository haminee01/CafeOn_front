// 1:1 채팅 플로우 관리 훅

import React, { useState, useCallback } from "react";

interface UserProfile {
  id: string;
  name: string;
}

interface ProfileClickHandler {
  (
    senderId: string,
    senderName: string,
    event: React.MouseEvent<HTMLElement>
  ): void;
}

interface ChatFlowState {
  targetUserForPopup: UserProfile | null;
  popupPosition: { x: number; y: number } | null;
  targetUserForPrivateChat: UserProfile | null;
}

interface ChatFlowActions extends ChatFlowState {
  handleProfileClick: ProfileClickHandler;
  handleStartPrivateChat: (user: UserProfile) => void;
  closePrivateChatModal: () => void;
  closePopup: () => void;
}

interface Participant {
  id: string;
  name: string;
}

export const usePrivateChatFlow = (
  DUMMY_PROFILES: { [key: string]: UserProfile },
  relativeRef?: React.RefObject<HTMLElement | null>,
  participants?: Participant[] // 참여자 목록 추가
): ChatFlowActions => {
  // 프로필 팝업 관련 상태
  const [targetUserForPopup, setTargetUserForPopup] =
    useState<UserProfile | null>(null);
  const [popupPosition, setPopupPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // 1:1 채팅 모달 관련 상태
  const [targetUserForPrivateChat, setTargetUserForPrivateChat] =
    useState<UserProfile | null>(null);

  // 미니 팝업 닫기
  const closePopup = useCallback(() => {
    setTargetUserForPopup(null);
    setPopupPosition(null);
  }, []);

  // 1:1 채팅 모달 닫기
  const closePrivateChatModal = useCallback(() => {
    setTargetUserForPrivateChat(null);
  }, []);

  // 1:1 대화 시작 버튼 클릭 핸들러
  const handleStartPrivateChat = useCallback(
    (user: UserProfile) => {
      closePopup(); // 미니 팝업 닫기
      setTargetUserForPrivateChat(user); // 1:1 채팅 모달 열기
    },
    [closePopup]
  );

  // 프로필 클릭 핸들러 (미니 팝업 열기)
  const handleProfileClick: ProfileClickHandler = useCallback(
    (senderId, senderName, event) => {
      event.stopPropagation();

      // 자신의 프로필 클릭 시 팝업 닫기
      if (senderId === "user-me") {
        closePopup();
        return;
      }

      // 참여자 목록에서 실제 userId 찾기 (닉네임으로 검색)
      let actualUserId = senderId;

      if (participants && participants.length > 0) {
        // 닉네임이 일치하는 참여자 찾기
        const participant = participants.find(
          (p) => p.name === senderName || p.name === senderId
        );

        if (participant) {
          actualUserId = participant.id;
        } else {
        }
      }

      // actualUserId가 유효한 사용자 ID인지 확인
      // 데모 모드에서는 "user-2" 같은 ID도 정상 대상이므로 허용한다.
      const isValidUserId =
        actualUserId &&
        actualUserId !== "user-me" &&
        actualUserId !== "1" &&
        actualUserId !== "user-1" &&
        actualUserId.length >= 2; // 최소 2자 이상

      if (!isValidUserId) {
        console.warn("유효하지 않은 사용자 ID:", actualUserId);
        closePopup();
        return;
      }

      const userProfile = DUMMY_PROFILES[actualUserId] || {
        id: actualUserId,
        name: senderName,
      };

      // 이미 열려있는 팝업을 다시 클릭하면 닫기 (실제 매핑된 ID 기준)
      if (targetUserForPopup && targetUserForPopup.id === actualUserId) {
        closePopup();
        return;
      }

      // 팝업 위치 계산
      const rect = event.currentTarget.getBoundingClientRect();
      let x = event.clientX;
      let y = event.clientY;

      // 모달 내부 상대 위치로 계산
      if (relativeRef && relativeRef.current) {
        const modalRect = relativeRef.current.getBoundingClientRect();
        x = rect.right + 8 - modalRect.left;
        y = rect.top + rect.height / 2 - modalRect.top;
      }

      setTargetUserForPopup(userProfile);
      setPopupPosition({ x, y });
    },
    [closePopup, targetUserForPopup, DUMMY_PROFILES, relativeRef, participants]
  );

  return {
    targetUserForPopup,
    popupPosition,
    targetUserForPrivateChat,
    handleProfileClick,
    handleStartPrivateChat,
    closePrivateChatModal,
    closePopup,
  };
};
