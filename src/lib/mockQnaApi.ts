import {
  QuestionListItem,
  QuestionListResponse,
  QuestionVisibility,
  QuestionStatus,
  QuestionDetail,
  CreateQuestionRequest,
  CreateQuestionResponse,
  Answer,
} from "@/types/qna";

const QNA_STORAGE_KEY = "cafeon-demo-qna-questions-v2";
const QNA_ANSWERS_KEY = "cafeon-demo-qna-answers-v2";

interface InquiryTemplate {
  title: string;
  content: string;
  answer?: string;
}

const MY_INQUIRY_TEMPLATES: InquiryTemplate[] = [
  {
    title: "스타벅스 강남점 주말 영업시간 문의",
    content:
      "안녕하세요. CafeOn을 자주 이용하고 있습니다.\n\n스타벅스 강남점 상세 페이지에 표시된 영업시간이 평일 기준(07:00~22:00)으로만 안내되어 있는데, 토·일요일이나 공휴일에는 운영 시간이 다른지 궁금합니다.\n\n이번 주 토요일 오후에 방문 예정이라 정확한 시간을 확인하고 싶습니다. 답변 부탁드립니다.",
    answer:
      "안녕하세요, CafeOn 고객센터입니다.\n\n문의해 주신 스타벅스 강남점은 토·일요일 및 공휴일에도 평일과 동일하게 07:00~22:00 운영합니다. 다만 설·추석 당일 등 일부 공휴일에는 매장 사정에 따라 단축 운영될 수 있으니, 방문 전 매장에 한 번 더 확인해 주시면 좋습니다.\n\n영업시간 안내가 더 명확히 보이도록 상세 페이지 표기도 개선하겠습니다. 이용해 주셔서 감사합니다.",
  },
  {
    title: "북마크한 카페 목록을 친구와 공유할 수 있나요?",
    content:
      "제가 북마크해 둔 카페 목록이 꽤 많은데, 친구에게 추천해 주고 싶을 때마다 카페 이름을 일일이 알려주고 있습니다.\n\n혹시 북마크 목록을 링크로 공유하거나, 다른 사용자에게 보낼 수 있는 기능이 있나요? 없다면 추후 추가 계획이 있는지도 궁금합니다.",
  },
  {
    title: "작성한 카페 리뷰 수정이 안 됩니다",
    content:
      "지난주에 투썸플레이스 강남역점에 남긴 리뷰에서 오타를 발견했습니다. 마이페이지 > 나의 리뷰에서 해당 리뷰를 찾았는데 수정 버튼이 보이지 않아요.\n\n리뷰 작성 후 일정 기간이 지나면 수정이 불가능한 건가요? 수정 가능 기간과 방법을 안내해 주시면 감사하겠습니다.",
  },
  {
    title: "회원 탈퇴 후 같은 이메일로 재가입 가능한가요?",
    content:
      "계정을 새로 만들고 싶어서 탈퇴를 고려 중입니다.\n\n탈퇴 후에도 기존에 사용하던 이메일 주소로 다시 가입할 수 있는지, 탈퇴 시 삭제되는 정보(리뷰, 북마크, 채팅 기록 등) 범위도 함께 알려주시면 도움이 될 것 같습니다.",
    answer:
      "안녕하세요, CafeOn 고객센터입니다.\n\n회원 탈퇴 후에는 개인정보 보호를 위해 계정 정보가 삭제되며, 동일 이메일로 재가입은 탈퇴 완료일로부터 30일 이후에 가능합니다.\n\n탈퇴 시 삭제되는 항목: 프로필 정보, 북마크, 채팅 내역, 개인 문의 내역\n유지되는 항목: 이미 게시된 공개 리뷰(작성자명은 '탈퇴회원'으로 표시)\n\n추가로 궁금한 점이 있으시면 언제든 문의해 주세요.",
  },
  {
    title: "카페 위치가 지도와 실제 주소가 달라 보여요",
    content:
      "망원동 쪽에 등록된 '카페 레이어드 망원점'을 지도에서 확인했는데, 핀 위치가 실제 가게 위치보다 한 블록 정도 떨어져 있는 것 같습니다.\n\n직접 방문할 때 GPS로 찾기가 어려웠습니다. 위치 정보 수정은 어떻게 요청하면 될까요?",
  },
  {
    title: "카페 단체 채팅방은 몇 명까지 참여 가능한가요?",
    content:
      "동아리 모임 장소를 정하려고 CafeOn 채팅 기능을 써보려고 합니다.\n\n단체 채팅방 최대 인원 제한이 있는지, 초대는 링크로 가능한지, 비회원도 초대할 수 있는지 알려주시면 감사하겠습니다.",
  },
  {
    title: "비공개 문의합니다 - 결제 내역 확인 요청",
    content:
      "[비공개 문의]\n\n회원 이메일: guest@example.com\n\n지난달 프리미엄 멤버십 결제 건에 대한 영수증이 필요합니다. 마이페이지에서는 결제 내역이 보이지 않아서 문의드립니다.\n\n결제일: 2026년 3월 15일\n결제 수단: 카카오페이\n\n영수증 발급 또는 결제 내역 확인 방법을 안내해 주세요.",
    answer:
      "안녕하세요, CafeOn 고객센터입니다.\n\n문의하신 2026년 3월 15일 프리미엄 멤버십 결제 건을 확인했습니다. 결제 금액 9,900원, 결제 수단 카카오페이로 정상 처리되었습니다.\n\n영수증은 가입 시 등록하신 이메일(guest@example.com)로 오늘 중 발송해 드리겠습니다. 마이페이지 > 결제 내역 메뉴는 현재 준비 중이며, 4월 말 오픈 예정입니다.\n\n개인정보가 포함된 문의이므로 비공개로 처리했습니다. 감사합니다.",
  },
  {
    title: "추천 카페는 어떤 기준으로 선정되나요?",
    content:
      "홈 화면에 보이는 '오늘의 추천 카페'가 매일 바뀌는 것 같은데, 추천 기준이 궁금합니다.\n\n제가 자주 가는 지역이나 취향(조용한 분위기, 디저트 맛집 등)을 반영해서 추천받을 수 있는 방법이 있을까요?",
  },
  {
    title: "모바일에서 카페 상세 사진이 잘 안 보여요",
    content:
      "아이폰 사파리로 CafeOn에 접속하면 카페 상세 페이지의 사진이 세로로 길게 늘어나거나 잘려서 보입니다.\n\nPC에서는 정상인데 모바일에서만 그래서, 혹시 모바일 뷰 최적화 이슈가 있는지 확인 부탁드립니다. 사용 환경: iOS 18, Safari 최신 버전입니다.",
  },
];

const OTHER_INQUIRY_TEMPLATES: InquiryTemplate[] = [
  {
    title: "카페 등록 요청 - 홍대 신규 오픈 매장",
    content:
      "홍대입구역 근처에 이번 달 새로 오픈한 '브루잉 스튜디오'가 아직 CafeOn에 등록되어 있지 않습니다.\n\n주소: 서울 마포구 와우산로 29길 12\n영업시간: 매일 10:00~21:00\n\n신규 카페 등록 절차가 어떻게 되는지 안내해 주세요.",
    answer:
      "안녕하세요, CafeOn 고객센터입니다.\n\n신규 카페 등록 요청 감사합니다. 제보해 주신 '브루잉 스튜디오'는 영업일 기준 3~5일 내 검수 후 등록 예정입니다.\n\n사업자가 직접 등록을 원하시면 마이페이지 > 카페 등록 요청 메뉴에서 신청서를 작성해 주시면 더 빠르게 처리됩니다. 감사합니다.",
  },
  {
    title: "리뷰에 사진을 여러 장 첨부할 수 있나요?",
    content:
      "카페 리뷰 작성 시 사진을 한 장만 올릴 수 있는 것 같은데, 인테리어·메뉴·분위기 등 여러 장을 올리고 싶습니다.\n\n다중 이미지 업로드 기능 지원 여부를 알려주세요.",
  },
  {
    title: "잘못된 리뷰 신고 후 처리 기간이 궁금합니다",
    content:
      "허위로 보이는 리뷰를 신고했는데 아직 '검토 중' 상태입니다.\n\n신고 처리에 보통 며칠이 걸리는지, 처리 결과는 어디서 확인할 수 있는지 알려주시면 감사하겠습니다.",
  },
  {
    title: "알림 설정을 변경했는데 푸시가 계속 옵니다",
    content:
      "마이페이지에서 '새 메시지 알림'을 꺼 두었는데도 채팅 메시지 푸시 알림이 계속 수신됩니다.\n\n앱 알림 설정과 웹 알림 설정이 따로 동작하는 건지, 완전히 끄는 방법을 알려주세요.",
    answer:
      "안녕하세요, CafeOn 고객센터입니다.\n\n불편을 드려 죄송합니다. 웹 브라우저 알림 권한과 앱 내 알림 설정이 별도로 관리되고 있어, 웹에서 끄더라도 앱 푸시가 올 수 있습니다.\n\n앱 > 설정 > 알림에서 '채팅 메시지' 항목을 OFF로 변경해 주시고, 브라우저에서는 주소창 왼쪽 자물쇠 아이콘 > 알림 > 차단으로 설정해 주세요.\n\n설정 후에도 알림이 오면 기기 모델과 앱 버전을 알려주시면 추가 확인하겠습니다.",
  },
  {
    title: "카페 검색 시 필터 기능 추가 요청",
    content:
      "카페 검색할 때 '콘센트 많음', '반려동물 동반 가능', '주차 가능' 같은 조건으로 필터링하면 좋겠습니다.\n\n비슷한 기능 개발 계획이 있는지, 있다면 언제쯤 이용할 수 있을지 궁금합니다.",
  },
  {
    title: "다크 모드 지원 예정인가요?",
    content:
      "저녁에 CafeOn을 이용할 때 화면이 밝아서 눈이 피로합니다.\n\n다크 모드 또는 시스템 설정 연동 다크 테마 지원 계획이 있는지 문의드립니다.",
  },
  {
    title: "채팅방에서 보낸 사진이 상대방에게 안 보입니다",
    content:
      "어제 카페 채팅방에서 메뉴 사진을 보냈는데 상대방 화면에는 '이미지를 불러올 수 없습니다'라고 표시된다고 합니다.\n\n본인에게는 정상적으로 보이는데, 이미지 전송 오류인지 확인 부탁드립니다.",
    answer:
      "안녕하세요, CafeOn 고객센터입니다.\n\n이미지 전송 오류 문의 감사합니다. 해당 이슈는 일부 iOS 기기에서 HEIC 형식 사진 전송 시 발생하는 것으로 확인되어, JPEG 자동 변환 패치를 4월 25일 배포 예정입니다.\n\n임시 해결 방법: 사진 전송 전 갤러리에서 '가장 호환성 있는 형식'으로 저장 후 다시 전송해 주세요. 불편을 드려 죄송합니다.",
  },
  {
    title: "제휴 및 광고 문의드립니다",
    content:
      "안녕하세요. 성수동 소재 프리미엄 디저트 카페 '달콤상점' 마케팅 담당자입니다.\n\nCafeOn 내 배너 광고 또는 추천 카페 노출 제휴에 관심이 있어 문의드립니다. 담당 부서 연락처나 미디어킷을 받을 수 있을까요?",
  },
  {
    title: "로그인이 자주 풀리는 현상이 있습니다",
    content:
      "PC Chrome에서 CafeOn을 이용하는데, 하루에 한두 번씩 로그인이 풀려 있습니다.\n\n'로그인 상태 유지'를 체크해도 동일하고, 다른 사이트에서는 문제가 없습니다. 세션 유지 시간이나 쿠키 관련 설정을 확인해 주실 수 있을까요?",
  },
];

const seedQuestions = (): QuestionDetail[] =>
  Array.from({ length: 18 }).map((_, idx) => {
    const isGuest = idx % 2 === 0;
    const templateIdx = Math.floor(idx / 2);
    const template = isGuest
      ? MY_INQUIRY_TEMPLATES[templateIdx]
      : OTHER_INQUIRY_TEMPLATES[templateIdx];

    return {
      id: idx + 1,
      title: template.title,
      content: template.content,
      authorNickname: isGuest ? "게스트" : "데모유저",
      createdAt: new Date(Date.now() - idx * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - idx * 43200000).toISOString(),
      status: idx % 3 === 0 ? QuestionStatus.ANSWERED : QuestionStatus.PENDING,
      visibility:
        idx % 4 === 0 ? QuestionVisibility.PRIVATE : QuestionVisibility.PUBLIC,
    };
  });

const seedAnswers = (): Record<number, Answer[]> => {
  const answers: Record<number, Answer[]> = {};
  let answerId = 1;

  seedQuestions().forEach((question, idx) => {
    if (question.status !== QuestionStatus.ANSWERED) return;

    const templateIdx = Math.floor(idx / 2);
    const template =
      idx % 2 === 0
        ? MY_INQUIRY_TEMPLATES[templateIdx]
        : OTHER_INQUIRY_TEMPLATES[templateIdx];

    if (!template.answer) return;

    answers[question.id] = [
      {
        answerId: answerId++,
        questionId: question.id,
        adminNickname: "CafeOn 고객센터",
        content: template.answer,
        createdAt: new Date(
          new Date(question.createdAt).getTime() + 86400000
        ).toISOString(),
        updatedAt: null,
      },
    ];
  });

  return answers;
};

const readStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(raw) as T;
};

const writeStorage = <T>(key: string, value: T) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
};

const getAllQuestions = () => readStorage<QuestionDetail[]>(QNA_STORAGE_KEY, seedQuestions());
const getAllAnswers = () => readStorage<Record<number, Answer[]>>(QNA_ANSWERS_KEY, seedAnswers());

const DEMO_MY_QUESTION_AUTHOR = "게스트";

export const getQuestionListMock = (params: {
  page: number;
  size: number;
  keyword?: string;
  authorNickname?: string;
}) => {
  let all = getAllQuestions();
  if (params.authorNickname) {
    all = all.filter((q) => q.authorNickname === params.authorNickname);
  }
  const keyword = (params.keyword || "").trim().toLowerCase();
  const filtered = keyword
    ? all.filter(
        (q) =>
          q.title.toLowerCase().includes(keyword) ||
          q.content.toLowerCase().includes(keyword) ||
          q.authorNickname.toLowerCase().includes(keyword)
      )
    : all;

  const sorted = [...filtered].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const page = Math.max(0, params.page);
  const size = Math.max(1, params.size);
  const start = page * size;
  const contentRaw = sorted.slice(start, start + size);
  const content: QuestionListItem[] = contentRaw.map((q) => ({
    id: q.id,
    title: q.title,
    authorNickname: q.authorNickname,
    createdAt: q.createdAt,
    status: q.status,
    visibility: q.visibility,
  }));

  const totalElements = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const response: QuestionListResponse = {
    totalElements,
    totalPages,
    size,
    content,
    number: page,
    sort: { empty: false, sorted: true, unsorted: false },
    first: page === 0,
    last: page >= totalPages - 1,
    numberOfElements: content.length,
    pageable: {
      offset: start,
      sort: { empty: false, sorted: true, unsorted: false },
      pageNumber: page,
      pageSize: size,
      paged: true,
      unpaged: false,
    },
    empty: content.length === 0,
  };
  return response;
};

export const getMyQuestionListMock = (params: {
  page: number;
  size: number;
  keyword?: string;
}) => getQuestionListMock({ ...params, authorNickname: DEMO_MY_QUESTION_AUTHOR });

export const getQuestionDetailMock = (id: number) => {
  const found = getAllQuestions().find((q) => q.id === id);
  if (!found) throw new Error("문의를 찾을 수 없습니다.");
  return found;
};

export const createQuestionMock = (data: CreateQuestionRequest): CreateQuestionResponse => {
  const all = getAllQuestions();
  const nextId = all.length > 0 ? Math.max(...all.map((q) => q.id)) + 1 : 1;
  const now = new Date().toISOString();
  const created: QuestionDetail = {
    id: nextId,
    title: data.title,
    content: data.content,
    authorNickname: "게스트",
    createdAt: now,
    updatedAt: now,
    status: QuestionStatus.PENDING,
    visibility: data.visibility,
  };
  writeStorage(QNA_STORAGE_KEY, [created, ...all]);
  return {
    ...created,
    status: QuestionStatus.PENDING,
  };
};

export const getAnswerListMock = (questionId: number): Answer[] => {
  const map = getAllAnswers();
  return map[questionId] || [];
};

export const updateQuestionMock = (
  questionId: number,
  updateData: { title: string; content: string; visibility: "PUBLIC" | "PRIVATE" }
) => {
  const all = getAllQuestions();
  const updated = all.map((q) =>
    q.id === questionId ? { ...q, ...updateData, updatedAt: new Date().toISOString() } : q
  );
  writeStorage(QNA_STORAGE_KEY, updated);
  return true;
};

export const deleteQuestionMock = (questionId: number) => {
  writeStorage(
    QNA_STORAGE_KEY,
    getAllQuestions().filter((q) => q.id !== questionId)
  );
  const answers = getAllAnswers();
  delete answers[questionId];
  writeStorage(QNA_ANSWERS_KEY, answers);
  return true;
};
