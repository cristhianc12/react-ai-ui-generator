import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock server actions
vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";

const mockSignInAction = vi.mocked(signInAction);
const mockSignUpAction = vi.mocked(signUpAction);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnonWorkData.mockReturnValue(null);
  });

  describe("initial state", () => {
    test("returns isLoading as false initially", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("exposes signIn and signUp functions", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
    });
  });

  describe("signIn", () => {
    test("calls signInAction with email and password", async () => {
      mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockSignInAction).toHaveBeenCalledWith("user@example.com", "password123");
    });

    test("sets isLoading to true while in flight, false when done", async () => {
      let resolveSignIn!: (val: { success: boolean }) => void;
      mockSignInAction.mockReturnValue(
        new Promise((res) => { resolveSignIn = res; })
      );

      const { result } = renderHook(() => useAuth());

      let promise: Promise<unknown>;
      act(() => {
        promise = result.current.signIn("user@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: false });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from signInAction", async () => {
      mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "badpassword");
      });

      expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    });

    test("sets isLoading to false even if signInAction throws", async () => {
      mockSignInAction.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    describe("on success – post sign-in routing", () => {
      test("migrates anon work and redirects to new project when anon messages exist", async () => {
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue({
          messages: [{ role: "user", content: "hello" }],
          fileSystemData: { "/App.jsx": { type: "file", content: "" } },
        });
        mockCreateProject.mockResolvedValue({ id: "proj-anon-123" } as any);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [{ role: "user", content: "hello" }],
            data: { "/App.jsx": { type: "file", content: "" } },
          })
        );
        expect(mockClearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/proj-anon-123");
      });

      test("does NOT migrate anon work when messages array is empty", async () => {
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
        mockGetProjects.mockResolvedValue([{ id: "proj-existing" } as any]);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).not.toHaveBeenCalled();
        expect(mockClearAnonWork).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/proj-existing");
      });

      test("redirects to most recent existing project when no anon work", async () => {
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([
          { id: "proj-recent" } as any,
          { id: "proj-older" } as any,
        ]);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/proj-recent");
      });

      test("creates a new project and redirects when user has no existing projects", async () => {
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "proj-brand-new" } as any);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({ messages: [], data: {} })
        );
        expect(mockPush).toHaveBeenCalledWith("/proj-brand-new");
      });

      test("does NOT call handlePostSignIn when sign-in fails", async () => {
        mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "wrongpassword");
        });

        expect(mockGetProjects).not.toHaveBeenCalled();
        expect(mockCreateProject).not.toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });

  describe("signUp", () => {
    test("calls signUpAction with email and password", async () => {
      mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(mockSignUpAction).toHaveBeenCalledWith("new@example.com", "password123");
    });

    test("sets isLoading to true while in flight, false when done", async () => {
      let resolveSignUp!: (val: { success: boolean }) => void;
      mockSignUpAction.mockReturnValue(
        new Promise((res) => { resolveSignUp = res; })
      );

      const { result } = renderHook(() => useAuth());

      let promise: Promise<unknown>;
      act(() => {
        promise = result.current.signUp("new@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: false });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from signUpAction", async () => {
      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "proj-new" } as any);

      const { result } = renderHook(() => useAuth());
      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signUp("new@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: true });
    });

    test("sets isLoading to false even if signUpAction throws", async () => {
      mockSignUpAction.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@example.com", "password123").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("runs post-sign-in routing on successful sign-up", async () => {
      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "proj-after-signup" } as any]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-after-signup");
    });

    test("does NOT call handlePostSignIn when sign-up fails", async () => {
      mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("taken@example.com", "password123");
      });

      expect(mockGetProjects).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
