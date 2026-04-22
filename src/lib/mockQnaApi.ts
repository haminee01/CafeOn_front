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

const QNA_STORAGE_KEY = "cafeon-demo-qna-questions";
const QNA_ANSWERS_KEY = "cafeon-demo-qna-answers";

const seedQuestions = (): QuestionDetail[] =>
  Array.from({ length: 18 }).map((_, idx) => ({
    id: idx + 1,
    title: `카페 이용 문의 ${idx + 1}`,
    content: "목업 QnA 데이터입니다. 데모 모드에서 목록/상세/작성/수정/삭제가 가능합니다.",
    authorNickname: idx % 2 === 0 ? "게스트" : "데모유저",
    createdAt: new Date(Date.now() - idx * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - idx * 43200000).toISOString(),
    status: idx % 3 === 0 ? QuestionStatus.ANSWERED : QuestionStatus.PENDING,
    visibility: idx % 4 === 0 ? QuestionVisibility.PRIVATE : QuestionVisibility.PUBLIC,
  }));

const seedAnswers = (): Record<number, Answer[]> => ({
  1: [
    {
      answerId: 1,
      questionId: 1,
      adminNickname: "관리자",
      content: "문의 주신 내용 확인했습니다. 현재는 목업 데이터로 운영 중입니다.",
      createdAt: new Date().toISOString(),
      updatedAt: null,
    },
  ],
  4: [
    {
      answerId: 2,
      questionId: 4,
      adminNickname: "관리자",
      content: "감사합니다. 다음 배포에서 반영하겠습니다.",
      createdAt: new Date().toISOString(),
      updatedAt: null,
    },
  ],
});

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

export const getQuestionListMock = (params: { page: number; size: number; keyword?: string }) => {
  const all = getAllQuestions();
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
