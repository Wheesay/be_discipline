import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const C = {
  ink: '#1C1C1E',
  inkDark: '#111111',
  cream: '#F6F6FA',
  paper: '#FFFFFF',
  coral: '#5B5FEF',
  sage: '#AEAEB2',
  muted: '#6E6E73',
  line: '#D1D1D6',
  white: '#FFFFFF',
  blush: '#ECECFF',
  move: '#15966A',
  moveTint: '#E2F5ED',
  fuel: '#E87524',
  fuelTint: '#FFF0E4',
  focus: '#7857E8',
  focusTint: '#EEE9FF',
};

const categoryColors = {
  MOVE: { accent: C.move, tint: C.moveTint },
  FUEL: { accent: C.fuel, tint: C.fuelTint },
  FOCUS: { accent: C.focus, tint: C.focusTint },
} as const;

type Tab = 'today' | 'feed' | 'log' | 'friends' | 'profile' | 'reminders' | 'goal-settings';
type Reaction = 'heart' | 'kudos';

type User = {
  name: string;
  username: string;
};

type Goal = {
  id: string;
  title: string;
  detail: string;
  category: 'MOVE' | 'FUEL' | 'FOCUS';
  done: boolean;
  completedDate?: string;
  completionDates?: string[];
  weeklyGoalId?: string;
  plannedDays?: number[];
  location?: string;
  bodyAreas?: string[];
  calories?: number;
  dailyTarget?: number;
  dailyUnit?: string;
  progressByDate?: Record<string, number>;
  reminder?: GoalReminder;
};

type GoalReminder = {
  enabled: boolean;
  hour: number;
  minute: number;
  notificationId?: string;
  notificationIds?: string[];
};

type WeeklyGoal = {
  id: string;
  title: string;
  target: number;
  unit: string;
  category: Goal['category'];
  plannedDays: number[];
  completionDates: string[];
};

type Friend = {
  id: string;
  name: string;
  username: string;
  initials: string;
  color: string;
  mutual: number;
  added: boolean;
};

type Post = {
  id: string;
  author: string;
  username: string;
  initials: string;
  avatarColor: string;
  activity: string;
  category: string;
  caption: string;
  image?: string;
  photoColor?: string;
  photoEmoji?: string;
  time: string;
  duration: string;
  reactions: Record<Reaction, number>;
  mine?: boolean;
  shared?: boolean;
};

const starterGoals: Goal[] = [
  { id: 'g1', title: 'Weight training', detail: 'Upper body', location: 'Home', category: 'MOVE', done: false, weeklyGoalId: 'weekly-exercise', plannedDays: [1, 3, 5] },
  { id: 'g2', title: 'Cook a balanced dinner', detail: 'Protein + greens', location: 'Home', category: 'FUEL', done: false, weeklyGoalId: 'weekly-meals', plannedDays: [2, 4, 6] },
  { id: 'g3', title: 'Evening walk', detail: '30 min · Phone stays home', category: 'MOVE', done: false, weeklyGoalId: 'weekly-exercise', plannedDays: [7] },
];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfCurrentWeek() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day + 1);
  return date;
}

function weekDateKey(offset: number) {
  const date = startOfCurrentWeek();
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}

function currentWeekDates() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = startOfCurrentWeek();
    date.setDate(date.getDate() + index);
    return date;
  });
}

function weeklyGoalMatchesDaily(weeklyGoal: WeeklyGoal, dailyGoal: Goal) {
  return dailyGoal.weeklyGoalId === weeklyGoal.id;
}

const starterWeeklyGoals: WeeklyGoal[] = [
  {
    id: 'weekly-exercise',
    title: 'Exercise',
    target: 3,
    unit: 'times',
    category: 'MOVE',
    plannedDays: [1, 3, 6],
    completionDates: [weekDateKey(0), weekDateKey(2)],
  },
  {
    id: 'weekly-meals',
    title: 'Balanced meals',
    target: 5,
    unit: 'meals',
    category: 'FUEL',
    plannedDays: [1, 2, 3, 4, 5],
    completionDates: [weekDateKey(0), weekDateKey(1)],
  },
];

const weeklyGoalIdeas: WeeklyGoal[] = [
  { id: 'weekly-walks', title: 'Go for a walk', target: 4, unit: 'days', category: 'MOVE', plannedDays: [1, 3, 5, 7], completionDates: [] },
  { id: 'weekly-water', title: 'Drink enough water', target: 7, unit: 'days', category: 'FUEL', plannedDays: [1, 2, 3, 4, 5, 6, 7], completionDates: [] },
  { id: 'weekly-cheat', title: 'Cheat day', target: 1, unit: 'day', category: 'FUEL', plannedDays: [7], completionDates: [] },
  { id: 'weekly-study', title: 'Study', target: 5, unit: 'days', category: 'FOCUS', plannedDays: [1, 2, 3, 4, 5], completionDates: [] },
  { id: 'weekly-read', title: 'Read for 20 minutes', target: 4, unit: 'days', category: 'FOCUS', plannedDays: [2, 4, 6, 7], completionDates: [] },
  { id: 'weekly-sleep', title: 'Sleep on time', target: 5, unit: 'nights', category: 'FOCUS', plannedDays: [1, 2, 3, 4, 5], completionDates: [] },
];

const people: Friend[] = [
  { id: 'f1', name: 'Maya Koh', username: '@mayamoves', initials: 'MK', color: '#DF8168', mutual: 6, added: true },
  { id: 'f2', name: 'Alex Tan', username: '@alext', initials: 'AT', color: '#6E927E', mutual: 3, added: true },
  { id: 'f3', name: 'Nadia Lim', username: '@nadial', initials: 'NL', color: '#C4904C', mutual: 8, added: false },
  { id: 'f4', name: 'Jon Bell', username: '@jonbuilds', initials: 'JB', color: '#6C829D', mutual: 2, added: false },
  { id: 'f5', name: 'Priya Shah', username: '@priyashah', initials: 'PS', color: '#9A7193', mutual: 5, added: false },
];

const starterPosts: Post[] = [
  {
    id: 'p1',
    author: 'Maya Koh',
    username: '@mayamoves',
    initials: 'MK',
    avatarColor: '#DF8168',
    activity: 'Morning run',
    category: 'MOVE',
    caption: 'Did not feel like starting. Very glad I did. Easy pace and a clear head.',
    photoColor: '#B8C6B2',
    photoEmoji: '🏃‍♀️',
    time: '24 min ago',
    duration: '5.2 km · 34 min',
    reactions: { heart: 8, kudos: 12 },
  },
  {
    id: 'p2',
    author: 'Alex Tan',
    username: '@alext',
    initials: 'AT',
    avatarColor: '#6E927E',
    activity: 'Meal prep complete',
    category: 'FUEL',
    caption: 'Four lunches ready. Removing the decision is half the work.',
    photoColor: '#D8B985',
    photoEmoji: '🥗',
    time: '2 hr ago',
    duration: '4 balanced meals',
    reactions: { heart: 5, kudos: 9 },
  },
  {
    id: 'p3',
    author: 'Maya Koh',
    username: '@mayamoves',
    initials: 'MK',
    avatarColor: '#DF8168',
    activity: 'Deep work block',
    category: 'FOCUS',
    caption: 'Phone outside the room. One important task finished before lunch.',
    photoColor: '#A8B5C0',
    photoEmoji: '📚',
    time: 'Yesterday',
    duration: '90 focused minutes',
    reactions: { heart: 11, kudos: 7 },
  },
];

const storageKey = 'be-discipline-mobile-v1';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>('today');
  const [goals, setGoals] = useState(starterGoals);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>(starterWeeklyGoals);
  const [friends, setFriends] = useState(people);
  const [posts, setPosts] = useState(starterPosts);
  const [reacted, setReacted] = useState<Record<string, Reaction[]>>({});
  const [logGoal, setLogGoal] = useState<Goal | null>(null);
  const [logWeeklyGoalId, setLogWeeklyGoalId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!value) return;
        const state = JSON.parse(value);
        setUser(state.user ?? null);
        const today = dateKey(new Date());
        setGoals(
          (state.goals ?? starterGoals).map((goal: Goal) => {
            const completionDates = Array.isArray(goal.completionDates)
              ? goal.completionDates
              : goal.completedDate
                ? [goal.completedDate]
                : goal.done
                  ? [today]
                  : [];
            return {
              ...goal,
              completionDates,
              completedDate: completionDates.at(-1),
              done: completionDates.includes(today),
              plannedDays: goal.plannedDays ?? [1, 2, 3, 4, 5, 6, 7],
              weeklyGoalId:
                goal.weeklyGoalId ??
                (goal.category === 'MOVE'
                  ? 'weekly-exercise'
                  : goal.category === 'FUEL'
                    ? 'weekly-meals'
                    : undefined),
            };
          }),
        );
        setWeeklyGoals(
          Array.isArray(state.weeklyGoals)
            ? state.weeklyGoals.map((goal: WeeklyGoal & { current?: number }) => ({
                ...goal,
                plannedDays:
                  goal.plannedDays ??
                  Array.from({ length: Math.min(goal.target, 7) }, (_, index) => index + 1),
                completionDates:
                  goal.completionDates ??
                  Array.from(
                    { length: Math.min(goal.current ?? 0, 7) },
                    (_, index) => weekDateKey(index),
                  ),
              }))
            : [
                { ...starterWeeklyGoals[0], target: state.weeklyGoals?.exerciseTarget ?? 3 },
                { ...starterWeeklyGoals[1], target: state.weeklyGoals?.mealTarget ?? 5 },
              ],
        );
        setFriends(state.friends ?? people);
        setPosts(state.posts ?? starterPosts);
        setReacted(state.reacted ?? {});
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    AsyncStorage.setItem(
      storageKey,
      JSON.stringify({ user, goals, weeklyGoals, friends, posts, reacted }),
    );
  }, [loading, user, goals, weeklyGoals, friends, posts, reacted]);

  function openLog(goal?: Goal) {
    setLogWeeklyGoalId(null);
    setLogGoal(goal ?? null);
    setTab('log');
  }

  function openWeeklyLog(goal: WeeklyGoal) {
    setLogWeeklyGoalId(goal.id);
    setLogGoal({
      id: `weekly:${goal.id}`,
      title: goal.title,
      detail: '',
      category: goal.category,
      done: false,
    });
    setTab('log');
  }

  function addGoalMilestone(goal: Goal) {
    const today = dateKey(new Date());
    const target = goal.dailyTarget ?? 1;
    setGoals((current) =>
      current.map((item) => {
        if (item.id !== goal.id) return item;
        const progress = item.progressByDate?.[today] ?? 0;
        return {
          ...item,
          progressByDate: {
            ...(item.progressByDate ?? {}),
            [today]: Math.min(target, progress + 1),
          },
        };
      }),
    );
    Haptics.selectionAsync();
  }

  function publishPost(post: Post) {
    setPosts((current) => [post, ...current]);
    if (logWeeklyGoalId) {
      const today = dateKey(new Date());
      setWeeklyGoals((current) =>
        current.map((goal) =>
          goal.id === logWeeklyGoalId && !goal.completionDates.includes(today)
            ? { ...goal, completionDates: [...goal.completionDates, today] }
            : goal,
        ),
      );
    } else if (logGoal) {
      const completedToday = dateKey(new Date());
      setGoals((current) =>
        current.map((goal) =>
          goal.id === logGoal.id
            ? {
                ...goal,
                done: true,
                completedDate: completedToday,
                completionDates: Array.from(
                  new Set([...(goal.completionDates ?? []), completedToday]),
                ),
              }
            : goal,
        ),
      );
      setWeeklyGoals((current) =>
        current.map((goal) =>
          weeklyGoalMatchesDaily(goal, logGoal)
            ? {
                ...goal,
                completionDates: Array.from(new Set([...goal.completionDates, completedToday])),
              }
            : goal,
        ),
      );
    }
    setLogGoal(null);
    setLogWeeklyGoalId(null);
    setTab(post.shared === false ? 'today' : 'feed');
  }

  function react(postId: string, reaction: Reaction) {
    const already = reacted[postId]?.includes(reaction);
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              reactions: {
                ...post.reactions,
                [reaction]: Math.max(0, post.reactions[reaction] + (already ? -1 : 1)),
              },
            }
          : post,
      ),
    );
    setReacted((current) => ({
      ...current,
      [postId]: already
        ? (current[postId] ?? []).filter((item) => item !== reaction)
        : [...(current[postId] ?? []), reaction],
    }));
    if (!already) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <View style={styles.logoBlock}><Text style={styles.logoLetters}>BD</Text></View>
        <ActivityIndicator color={C.coral} />
      </View>
    );
  }

  if (!user) {
    return <Onboarding onComplete={setUser} />;
  }

  return (
    <SafeAreaView style={styles.app} edges={['top']}>
      <View style={styles.screen}>
        {tab === 'today' && (
          <TodayScreen
            user={user}
            goals={goals}
            weeklyGoals={weeklyGoals}
            onLog={openLog}
            onLogWeekly={openWeeklyLog}
            onMilestone={addGoalMilestone}
          />
        )}
        {tab === 'feed' && (
          <CommunityScreen
            posts={posts}
            reacted={reacted}
            onReact={react}
            friends={friends}
            setFriends={setFriends}
          />
        )}
        {tab === 'log' && (
          <LogScreen user={user} selectedGoal={logGoal} goals={goals} onPublish={publishPost} />
        )}
        {tab === 'profile' && (
          <ProfileScreen
            user={user}
            goals={goals}
            posts={posts}
            friends={friends}
            onOpenReminders={() => setTab('reminders')}
          />
        )}
        {tab === 'reminders' && <RemindersScreen onBack={() => setTab('profile')} />}
        {tab === 'goal-settings' && (
          <GoalSettingsScreen
            goals={goals}
            weeklyGoals={weeklyGoals}
            onSave={(nextGoals, nextWeeklyGoals) => {
              setGoals(nextGoals);
              setWeeklyGoals(nextWeeklyGoals);
            }}
          />
        )}
      </View>
      <BottomNav tab={tab} onChange={(next) => {
        setLogGoal(null);
        setLogWeeklyGoalId(null);
        setTab(next);
      }} />
    </SafeAreaView>
  );
}

function Onboarding({ onComplete }: { onComplete: (user: User) => void }) {
  const [step, setStep] = useState<'welcome' | 'account'>('welcome');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  if (step === 'welcome') {
    return (
      <SafeAreaView style={styles.onboarding}>
        <View style={styles.onboardArt}>
          <View style={styles.onboardSquare} />
          <View style={styles.onboardRing} />
          <Text style={styles.onboardMini}>BE DISCIPLINE</Text>
        </View>
        <View style={styles.onboardBody}>
          <Text style={styles.eyebrow}>DISCIPLINE, TOGETHER</Text>
          <Text style={styles.onboardTitle}>Show up.{'\n'}Share proof.{'\n'}Keep going.</Text>
          <Text style={styles.onboardText}>
            Turn private intentions into visible progress—with friends who keep you honest.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => setStep('account')}>
            <Text style={styles.primaryButtonText}>Create my account</Text>
            <Text style={styles.primaryButtonText}>→</Text>
          </Pressable>
          <Pressable
            style={styles.demoButton}
            onPress={() => onComplete({ name: 'Jordan Lee', username: '@jordanlee' })}>
            <Text style={styles.demoButtonText}>Use demo account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const valid = name.trim().length > 1 && username.trim().length > 2;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.onboarding}>
      <SafeAreaView style={styles.accountScreen}>
        <Pressable onPress={() => setStep('welcome')}><Text style={styles.back}>← Back</Text></Pressable>
        <View>
          <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
          <Text style={styles.accountTitle}>Start with your name.</Text>
          <Text style={styles.onboardText}>Your friends will see this when you share a completed activity.</Text>
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Jordan Lee"
            placeholderTextColor="#999E98"
            style={styles.input}
            autoCapitalize="words"
          />
          <Text style={styles.fieldLabel}>Username</Text>
          <View style={styles.usernameInput}>
            <Text style={styles.at}>@</Text>
            <TextInput
              value={username.replace('@', '')}
              onChangeText={setUsername}
              placeholder="jordanlee"
              placeholderTextColor="#999E98"
              style={styles.usernameText}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
        <Pressable
          disabled={!valid}
          style={[styles.primaryButton, !valid && styles.disabled]}
          onPress={() =>
            onComplete({ name: name.trim(), username: `@${username.trim().replace('@', '')}` })
          }>
          <Text style={styles.primaryButtonText}>Enter Be Discipline</Text>
          <Text style={styles.primaryButtonText}>→</Text>
        </Pressable>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function Header({ label, title, action }: { label: string; title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.eyebrow}>{label}</Text>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

function TodayScreen({
  user,
  goals,
  weeklyGoals,
  onLog,
  onLogWeekly,
  onMilestone,
}: {
  user: User;
  goals: Goal[];
  weeklyGoals: WeeklyGoal[];
  onLog: (goal: Goal) => void;
  onLogWeekly: (goal: WeeklyGoal) => void;
  onMilestone: (goal: Goal) => void;
}) {
  const todayWeekday = new Date().getDay() || 7;
  const todayGoals = goals.filter((goal) =>
    (goal.plannedDays ?? [1, 2, 3, 4, 5, 6, 7]).includes(todayWeekday),
  );
  const completed = todayGoals.filter((goal) => goal.done).length;
  const progress = `${todayGoals.length ? (completed / todayGoals.length) * 100 : 0}%` as `${number}%`;
  const weekDates = currentWeekDates();
  const today = dateKey(new Date());
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.nativeTodayContent}>
      <View style={styles.nativeTodayHeader}>
        <View>
          <Text style={styles.nativeTodayTitle}>Today</Text>
          <Text style={styles.nativeTodayDate}>{dateLabel}</Text>
        </View>
        <View style={styles.nativeAvatar}><Text style={styles.nativeAvatarText}>{initials(user.name)}</Text></View>
      </View>

      <View style={styles.weekCalendar}>
        {weekDates.map((date, index) => {
          const key = dateKey(date);
          const isToday = key === today;
          const completionCount =
            goals.filter((goal) => goal.completionDates?.includes(key)).length +
            weeklyGoals.filter((goal) => goal.completionDates.includes(key)).length;
          return (
            <View key={key} style={styles.weekCalendarDay}>
              <Text style={[styles.weekCalendarLabel, isToday && styles.weekCalendarLabelToday]}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
              </Text>
              <View style={[styles.weekCalendarDate, isToday && styles.weekCalendarDateToday]}>
                <Text style={[styles.weekCalendarNumber, isToday && styles.weekCalendarNumberToday]}>
                  {date.getDate()}
                </Text>
              </View>
              <View style={[styles.weekCalendarDot, completionCount > 0 && styles.weekCalendarDotDone]} />
            </View>
          );
        })}
      </View>

      <View style={styles.nativeSectionHeader}>
        <Text style={styles.nativeSectionTitle}>Daily goals</Text>
        <Text style={styles.nativeSectionMeta}>{completed} of {todayGoals.length}</Text>
      </View>
      <View style={styles.nativeProgressTrack}>
        <View style={[styles.nativeProgressFill, { width: progress }]} />
      </View>

      <View style={styles.nativeList}>
        {!todayGoals.length && (
          <View style={styles.noGoalsToday}>
            <Text style={styles.noGoalsTodayTitle}>Nothing scheduled today.</Text>
            <Text style={styles.noGoalsTodayText}>Your next planned goal will appear here.</Text>
          </View>
        )}
        {todayGoals.map((goal, index) => {
          const colors = categoryColors[goal.category];
          const linkedWeeklyGoal = weeklyGoals.find((weeklyGoal) => weeklyGoal.id === goal.weeklyGoalId);
          const milestoneTarget = goal.dailyTarget ?? 0;
          const milestoneProgress = goal.progressByDate?.[today] ?? 0;
          const milestoneReady = milestoneTarget > 1 && milestoneProgress >= milestoneTarget;
          return (
            <View
              key={goal.id}
              style={[styles.nativeGoalRow, index === todayGoals.length - 1 && styles.nativeLastRow]}>
              <View
                style={[
                  styles.nativeStatusCircle,
                  { borderColor: colors.accent },
                  goal.done && { backgroundColor: colors.accent },
                ]}>
                {goal.done && (
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    size={12}
                    tintColor={C.white}
                  />
                )}
              </View>
              <View style={styles.nativeGoalCopy}>
                <Text style={[styles.nativeGoalTitle, goal.done && styles.nativeGoalTitleDone]}>{goal.title}</Text>
                {!!(goal.detail || goal.location) && (
                  <Text style={styles.nativeGoalDetail}>
                    {[goal.detail, goal.location ? `⌖ ${goal.location}` : ''].filter(Boolean).join(' · ')}
                  </Text>
                )}
                {!!goal.bodyAreas?.length && (
                  <Text style={styles.nativeGoalDetail}>{goal.bodyAreas.join(' · ')}</Text>
                )}
                {!!goal.calories && (
                  <Text style={styles.nativeGoalDetail}>{goal.calories} kcal planned</Text>
                )}
                <Text style={[styles.nativeGoalCategory, { color: colors.accent }]}>
                  {linkedWeeklyGoal?.title ?? goal.category.toLowerCase()}
                  {goal.reminder?.enabled
                    ? ` · ${formatTime(goal.reminder.hour, goal.reminder.minute)}`
                    : ''}
                </Text>
              </View>
              {!goal.done && milestoneTarget > 1 && !milestoneReady && (
                <View style={styles.milestoneControl}>
                  <Text style={[styles.milestoneCount, { color: colors.accent }]}>
                    {milestoneProgress}/{milestoneTarget}
                  </Text>
                  <Text style={styles.milestoneUnit}>{goal.dailyUnit ?? 'steps'}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add one ${goal.dailyUnit ?? 'step'}`}
                    style={[styles.milestoneAdd, { backgroundColor: colors.tint }]}
                    onPress={() => onMilestone(goal)}>
                    <SymbolView
                      name={{ ios: 'plus', android: 'add', web: 'add' }}
                      size={15}
                      tintColor={colors.accent}
                    />
                  </Pressable>
                </View>
              )}
              {!goal.done && (milestoneTarget <= 1 || milestoneReady) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`I did ${goal.title}. Take a selfie`}
                  style={({ pressed }) => [
                    styles.nativeDoneButton,
                    { backgroundColor: colors.tint },
                    pressed && styles.nativePressed,
                  ]}
                  onPress={() => onLog(goal)}>
                  <SymbolView
                    name={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }}
                    size={15}
                    tintColor={colors.accent}
                  />
                  <Text style={[styles.nativeDoneText, { color: colors.accent }]}>
                    {milestoneReady ? 'Finish' : 'Done'}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.nativeSectionHeader}>
        <Text style={styles.nativeSectionTitle}>This week</Text>
      </View>
      <View style={styles.weeklyDashboardList}>
        {weeklyGoals.map((goal) => {
          const colors = categoryColors[goal.category];
          const weekKeys = weekDates.map(dateKey);
          const current = goal.completionDates.filter((date) => weekKeys.includes(date)).length;
          const remaining = Math.max(0, goal.target - current);
          const completedToday = goal.completionDates.includes(today);
          const percent = Math.min(100, Math.round((current / goal.target) * 100));
          const linkedPlannedDays = Array.from(
            new Set(
              goals
                .filter((dailyGoal) => dailyGoal.weeklyGoalId === goal.id)
                .flatMap((dailyGoal) => dailyGoal.plannedDays ?? []),
            ),
          );
          const displayedPlannedDays = linkedPlannedDays.length
            ? linkedPlannedDays
            : goal.plannedDays;
          return (
            <View key={goal.id} style={styles.weeklyDashboardCard}>
              <View style={styles.weeklyDashboardTop}>
                <View style={styles.nativeGoalCopy}>
                  <Text style={styles.weeklyDashboardTitle}>{goal.title}</Text>
                  <Text style={styles.weeklyDashboardStatus}>
                    {remaining === 0
                      ? 'Weekly goal completed'
                      : `${remaining} ${remaining === 1 ? 'time' : 'times'} left · auto-tracked`}
                  </Text>
                </View>
                <Text style={[styles.weeklyDashboardCount, { color: colors.accent }]}>
                  {current}<Text style={styles.weeklyDashboardTarget}>/{goal.target}</Text>
                </Text>
              </View>
              <View style={styles.weeklyProgressTrack}>
                <View
                  style={[
                    styles.weeklyProgressFill,
                    { backgroundColor: colors.accent, width: `${percent}%` },
                  ]}
                />
              </View>
              <View style={styles.weeklyDays}>
                {weekDates.map((date, index) => {
                  const key = dateKey(date);
                  const complete = goal.completionDates.includes(key);
                  const planned = displayedPlannedDays.includes(index + 1);
                  return (
                    <View key={key} style={styles.weeklyDay}>
                      <Text style={styles.weeklyDayLabel}>
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                      </Text>
                      <View
                        style={[
                          styles.weeklyDayCircle,
                          planned && { backgroundColor: colors.tint },
                          complete && { backgroundColor: colors.accent },
                          key === today && !complete && { borderColor: colors.accent },
                        ]}>
                        {complete ? (
                          <SymbolView
                            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                            size={11}
                            tintColor={C.white}
                          />
                        ) : (
                          <Text style={[styles.weeklyDayNumber, planned && { color: colors.accent }]}>
                            {date.getDate()}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${completedToday ? 'Logged' : 'Complete'} ${goal.title}`}
                disabled={completedToday}
                style={({ pressed }) => [
                  styles.weeklyDoneButton,
                  { backgroundColor: completedToday ? C.cream : colors.tint },
                  pressed && styles.nativePressed,
                ]}
                onPress={() => onLogWeekly(goal)}>
                <SymbolView
                  name={{
                    ios: completedToday ? 'checkmark.circle.fill' : 'camera.fill',
                    android: completedToday ? 'check_circle' : 'photo_camera',
                    web: completedToday ? 'check_circle' : 'photo_camera',
                  }}
                  size={16}
                  tintColor={completedToday ? C.muted : colors.accent}
                />
                <Text
                  style={[
                    styles.weeklyDoneText,
                    { color: completedToday ? C.muted : colors.accent },
                  ]}>
                  {completedToday ? 'Logged today' : 'Complete with selfie'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function GoalsCalendar({ goals }: { goals: Goal[] }) {
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(dateKey(now));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingBlanks = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const cells: Array<Date | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, monthIndex, index + 1)),
  ];
  while (cells.length % 7) cells.push(null);

  const selectedDate = new Date(`${selectedKey}T12:00:00`);
  const selectedWeekday = selectedDate.getDay() || 7;
  const selectedGoals = goals.filter((goal) =>
    (goal.plannedDays ?? [1, 2, 3, 4, 5, 6, 7]).includes(selectedWeekday),
  );
  const selectedLabel = selectedDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  function moveMonth(amount: number) {
    const next = new Date(year, monthIndex + amount, 1);
    setMonth(next);
    setSelectedKey(dateKey(next));
  }

  return (
    <View style={styles.goalsCalendarCard}>
      <View style={styles.goalsCalendarHeader}>
        <Text style={styles.goalsCalendarTitle}>
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <View style={styles.goalsCalendarNav}>
          <Pressable style={styles.calendarNavButton} onPress={() => moveMonth(-1)}>
            <Text style={styles.calendarNavText}>‹</Text>
          </Pressable>
          <Pressable style={styles.calendarNavButton} onPress={() => moveMonth(1)}>
            <Text style={styles.calendarNavText}>›</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.calendarGrid}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => (
          <Text key={`${label}-${index}`} style={styles.calendarWeekday}>{label}</Text>
        ))}
        {cells.map((date, index) => {
          if (!date) return <View key={`blank-${index}`} style={styles.calendarDayCell} />;
          const key = dateKey(date);
          const weekday = date.getDay() || 7;
          const planned = goals.some((goal) =>
            (goal.plannedDays ?? []).includes(weekday),
          );
          const completed = goals.some((goal) => goal.completionDates?.includes(key));
          const selected = key === selectedKey;
          return (
            <Pressable
              key={key}
              style={styles.calendarDayCell}
              onPress={() => setSelectedKey(key)}>
              <View
                style={[
                  styles.calendarDayCircle,
                  selected && styles.calendarDaySelected,
                  completed && styles.calendarDayCompleted,
                ]}>
                <Text
                  style={[
                    styles.calendarDayText,
                    (selected || completed) && styles.calendarDayTextSelected,
                  ]}>
                  {date.getDate()}
                </Text>
              </View>
              <View style={[styles.calendarPlanDot, planned && styles.calendarPlanDotActive]} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.calendarSelection}>
        <Text style={styles.calendarSelectionDate}>{selectedLabel}</Text>
        <Text style={styles.calendarSelectionGoals} numberOfLines={2}>
          {selectedGoals.length
            ? selectedGoals.map((goal) => goal.title).join(' · ')
            : 'No goals planned'}
        </Text>
      </View>
    </View>
  );
}

function GoalSettingsScreen({
  goals,
  weeklyGoals,
  onSave,
}: {
  goals: Goal[];
  weeklyGoals: WeeklyGoal[];
  onSave: (goals: Goal[], weeklyGoals: WeeklyGoal[]) => void;
}) {
  const [editing, setEditing] = useState<Goal | 'new' | null>(null);
  const [editingWeekly, setEditingWeekly] = useState<WeeklyGoal | 'new' | null>(null);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [location, setLocation] = useState('');
  const [bodyAreas, setBodyAreas] = useState<string[]>([]);
  const [calories, setCalories] = useState('');
  const [dailyTarget, setDailyTarget] = useState('');
  const [dailyUnit, setDailyUnit] = useState('');
  const [weeklyGoalId, setWeeklyGoalId] = useState<string | null>(null);
  const [plannedDays, setPlannedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [weeklyTitle, setWeeklyTitle] = useState('');
  const [weeklyTarget, setWeeklyTarget] = useState('1');
  const [weeklyUnit, setWeeklyUnit] = useState('times');
  const [weeklyCategory, setWeeklyCategory] = useState<Goal['category']>('MOVE');
  const [reminder, setReminder] = useState<GoalReminder>({
    enabled: false,
    hour: 9,
    minute: 0,
  });

  function beginNewGoal() {
    setTitle('');
    setDetail('');
    setLocation('');
    setBodyAreas([]);
    setCalories('');
    setDailyTarget('');
    setDailyUnit('');
    setWeeklyGoalId(null);
    setPlannedDays([1, 2, 3, 4, 5, 6, 7]);
    setReminder({ enabled: false, hour: 9, minute: 0 });
    setEditing('new');
  }

  function beginEditGoal(goal: Goal) {
    setTitle(goal.title);
    setDetail(goal.detail ?? '');
    setLocation(goal.location ?? '');
    setBodyAreas(goal.bodyAreas ?? []);
    setCalories(goal.calories ? String(goal.calories) : '');
    setDailyTarget(goal.dailyTarget ? String(goal.dailyTarget) : '');
    setDailyUnit(goal.dailyUnit ?? '');
    setWeeklyGoalId(goal.weeklyGoalId ?? null);
    setPlannedDays(goal.plannedDays ?? [1, 2, 3, 4, 5, 6, 7]);
    setReminder(goal.reminder ?? { enabled: false, hour: 9, minute: 0 });
    setEditing(goal);
  }

  function beginNewWeeklyGoal() {
    setWeeklyTitle('');
    setWeeklyTarget('1');
    setWeeklyUnit('times');
    setWeeklyCategory('MOVE');
    setEditingWeekly('new');
  }

  function beginEditWeeklyGoal(goal: WeeklyGoal) {
    setWeeklyTitle(goal.title);
    setWeeklyTarget(String(goal.target));
    setWeeklyUnit(goal.unit);
    setWeeklyCategory(goal.category);
    setEditingWeekly(goal);
  }

  function saveWeeklyGoal() {
    const cleanTitle = weeklyTitle.trim();
    const target = Math.max(1, Math.min(99, Number.parseInt(weeklyTarget, 10) || 1));
    const cleanUnit = weeklyUnit.trim() || 'times';
    if (!cleanTitle) return;
    const original = editingWeekly === 'new' ? null : editingWeekly;
    const saved: WeeklyGoal = {
      id: original?.id ?? `weekly-${Date.now()}`,
      title: cleanTitle,
      target,
      unit: cleanUnit,
      category: weeklyCategory,
      plannedDays: original?.plannedDays ?? [],
      completionDates: original?.completionDates ?? [],
    };
    const nextWeeklyGoals = original
      ? weeklyGoals.map((goal) => (goal.id === original.id ? saved : goal))
      : [...weeklyGoals, saved];
    const nextGoals = original
      ? goals.map((goal) =>
          goal.weeklyGoalId === original.id ? { ...goal, category: weeklyCategory } : goal,
        )
      : goals;
    onSave(nextGoals, nextWeeklyGoals);
    setEditingWeekly(null);
  }

  function deleteWeeklyGoal(goal: WeeklyGoal) {
    const linkedGoals = goals.filter((dailyGoal) => dailyGoal.weeklyGoalId === goal.id);
    Alert.alert(
      `Delete ${goal.title}?`,
      linkedGoals.length
        ? `This will also delete ${linkedGoals.length} linked daily ${linkedGoals.length === 1 ? 'goal' : 'goals'}.`
        : 'Its previous progress will also be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const reminderIds = linkedGoals.flatMap((dailyGoal) =>
              dailyGoal.reminder?.notificationIds ??
              (dailyGoal.reminder?.notificationId ? [dailyGoal.reminder.notificationId] : []),
            );
            await Promise.all(
              reminderIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
            );
            onSave(
              goals.filter((dailyGoal) => dailyGoal.weeklyGoalId !== goal.id),
              weeklyGoals.filter((weeklyGoal) => weeklyGoal.id !== goal.id),
            );
            setEditingWeekly(null);
          },
        },
      ],
    );
  }

  function toggleDailyDay(day: number) {
    setPlannedDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  function toggleBodyArea(area: string) {
    setBodyAreas((current) =>
      current.includes(area) ? current.filter((value) => value !== area) : [...current, area],
    );
  }

  function inferCategory(value: string): Goal['category'] {
    if (/walk|run|gym|workout|exercise|train|yoga|swim|cycle/i.test(value)) return 'MOVE';
    if (/meal|cook|food|water|eat|protein|vegetable/i.test(value)) return 'FUEL';
    return 'FOCUS';
  }

  async function saveDailyGoal() {
    const cleanTitle = title.trim();
    if (!cleanTitle || !weeklyGoalId || !plannedDays.length) return;
    const original = editing === 'new' ? undefined : editing ?? undefined;
    const linkedWeeklyGoal = weeklyGoals.find((goal) => goal.id === weeklyGoalId);
    let nextReminder: GoalReminder | undefined = reminder;
    const originalReminderIds = original?.reminder?.notificationIds ??
      (original?.reminder?.notificationId ? [original.reminder.notificationId] : []);
    const reminderUnchanged =
      original?.reminder?.enabled &&
      originalReminderIds.length > 0 &&
      reminder.enabled &&
      original.reminder.hour === reminder.hour &&
      original.reminder.minute === reminder.minute &&
      original.title === cleanTitle &&
      (original.detail ?? '') === detail.trim() &&
      JSON.stringify(original.plannedDays ?? [1, 2, 3, 4, 5, 6, 7]) === JSON.stringify(plannedDays);

    if (originalReminderIds.length && !reminderUnchanged) {
      await Promise.all(
        originalReminderIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
      );
    }

    const nextGoal: Goal = {
      id: original?.id ?? `goal-${Date.now()}`,
      title: cleanTitle,
      detail: detail.trim(),
      location: location.trim(),
      bodyAreas,
      calories: calories ? Math.max(0, Number.parseInt(calories, 10) || 0) : undefined,
      dailyTarget: dailyTarget
        ? Math.max(1, Number.parseInt(dailyTarget, 10) || 1)
        : undefined,
      dailyUnit: dailyTarget ? dailyUnit.trim() || 'times' : undefined,
      progressByDate: original?.progressByDate,
      category: linkedWeeklyGoal?.category ?? inferCategory(cleanTitle),
      done: original?.done ?? false,
      completedDate: original?.completedDate,
      completionDates: original?.completionDates,
      weeklyGoalId,
      plannedDays,
      reminder: nextReminder,
    };

    if (reminder.enabled && !reminderUnchanged) {
      const granted = await ensureNotificationPermission();
      if (granted) {
        const notificationIds = await scheduleGoalReminders(nextGoal);
        nextReminder = { ...reminder, notificationId: undefined, notificationIds };
      } else {
        nextReminder = { ...reminder, enabled: false, notificationId: undefined, notificationIds: [] };
        Alert.alert('Alarm not enabled', 'Allow notifications in phone settings to use goal alarms.');
      }
    } else if (reminderUnchanged) {
      nextReminder = { ...reminder, notificationId: undefined, notificationIds: originalReminderIds };
    } else {
      nextReminder = { ...reminder, notificationId: undefined, notificationIds: [] };
    }

    const savedGoal = { ...nextGoal, reminder: nextReminder };
    const nextGoals = original
      ? goals.map((goal) => (goal.id === original.id ? savedGoal : goal))
      : [...goals, savedGoal];
    onSave(nextGoals, weeklyGoals);
    setEditing(null);
  }

  async function deleteGoal(goal: Goal) {
    const reminderIds = goal.reminder?.notificationIds ??
      (goal.reminder?.notificationId ? [goal.reminder.notificationId] : []);
    await Promise.all(reminderIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    onSave(goals.filter((item) => item.id !== goal.id), weeklyGoals);
    setEditing(null);
  }

  function addWeeklyGoal(idea: WeeklyGoal) {
    if (weeklyGoals.some((goal) => goal.id === idea.id)) return;
    onSave(goals, [...weeklyGoals, idea]);
  }

  if (editingWeekly) {
    const existing = editingWeekly === 'new' ? null : editingWeekly;
    const canSaveWeekly = Boolean(weeklyTitle.trim() && weeklyUnit.trim());
    return (
      <KeyboardAvoidingView
        style={styles.goalSettingsScreen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.settingsNav}>
          <Pressable accessibilityRole="button" onPress={() => setEditingWeekly(null)}>
            <Text style={styles.settingsNavAction}>Cancel</Text>
          </Pressable>
          <Text style={styles.settingsNavTitle}>
            {existing ? 'Edit weekly goal' : 'New weekly goal'}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!canSaveWeekly}
            onPress={saveWeeklyGoal}>
            <Text
              style={[
                styles.settingsNavAction,
                styles.settingsSave,
                !canSaveWeekly && styles.disabled,
              ]}>
              Save
            </Text>
          </Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.singleGoalContent}>
          <Text style={styles.settingsSectionLabel}>WEEKLY OUTCOME</Text>
          <View style={styles.weeklyEditorCard}>
            <TextInput
              value={weeklyTitle}
              onChangeText={setWeeklyTitle}
              placeholder="Exercise"
              placeholderTextColor={C.sage}
              style={styles.weeklyEditorTitle}
              autoFocus
            />
            <View style={styles.weeklyEditorDivider} />
            <View style={styles.weeklyTargetFields}>
              <View style={styles.weeklyTargetField}>
                <Text style={styles.weeklyFieldLabel}>TARGET</Text>
                <TextInput
                  value={weeklyTarget}
                  onChangeText={setWeeklyTarget}
                  keyboardType="number-pad"
                  style={styles.weeklyTargetInput}
                  maxLength={2}
                />
              </View>
              <View style={styles.weeklyTargetDivider} />
              <View style={[styles.weeklyTargetField, styles.weeklyUnitField]}>
                <Text style={styles.weeklyFieldLabel}>UNIT</Text>
                <TextInput
                  value={weeklyUnit}
                  onChangeText={setWeeklyUnit}
                  placeholder="times"
                  placeholderTextColor={C.sage}
                  style={styles.weeklyTargetInput}
                />
              </View>
            </View>
          </View>

          <Text style={styles.settingsSectionLabel}>TYPE</Text>
          <View style={styles.weeklyCategoryChoices}>
            {(['MOVE', 'FUEL', 'FOCUS'] as const).map((category) => {
              const colors = categoryColors[category];
              const selected = weeklyCategory === category;
              return (
                <Pressable
                  key={category}
                  style={[
                    styles.weeklyCategoryChoice,
                    selected && { backgroundColor: colors.accent },
                  ]}
                  onPress={() => setWeeklyCategory(category)}>
                  <Text
                    style={[
                      styles.weeklyCategoryChoiceText,
                      selected && styles.weeklyCategoryChoiceTextSelected,
                    ]}>
                    {category === 'MOVE' ? 'Exercise' : category === 'FUEL' ? 'Food' : 'Personal'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.weeklyEditorNote}>
            <Text style={styles.weeklyEditorNoteText}>
              After saving, create daily goals and choose which days contribute to this target.
            </Text>
          </View>

          {existing && (
            <Pressable style={styles.deleteGoalButton} onPress={() => deleteWeeklyGoal(existing)}>
              <Text style={styles.deleteGoalText}>Delete weekly goal</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (editing) {
    const existing = editing === 'new' ? null : editing;
    const canSave = Boolean(title.trim() && weeklyGoalId && plannedDays.length);
    const linkedCategory = weeklyGoals.find((goal) => goal.id === weeklyGoalId)?.category;
    return (
      <KeyboardAvoidingView
        style={styles.goalSettingsScreen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.settingsNav}>
          <Pressable accessibilityRole="button" onPress={() => setEditing(null)}>
            <Text style={styles.settingsNavAction}>Cancel</Text>
          </Pressable>
          <Text style={styles.settingsNavTitle}>{existing ? 'Edit goal' : 'New goal'}</Text>
          <Pressable accessibilityRole="button" disabled={!canSave} onPress={saveDailyGoal}>
            <Text style={[styles.settingsNavAction, styles.settingsSave, !canSave && styles.disabled]}>
              Save
            </Text>
          </Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.singleGoalContent}>
          <Text style={styles.settingsSectionLabel}>ACTIVITY</Text>
          <View style={styles.singleGoalCard}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Weight training"
              placeholderTextColor={C.sage}
              style={styles.singleGoalInput}
              autoFocus
              returnKeyType="next"
            />
            <View style={styles.singleGoalDivider} />
            <TextInput
              value={detail}
              onChangeText={setDetail}
              placeholder="What counts as done? e.g. Arms or 3 bottles"
              placeholderTextColor={C.sage}
              style={styles.singleGoalSecondaryInput}
              returnKeyType="next"
            />
            <View style={styles.singleGoalDivider} />
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Location (optional), e.g. Home or Office (CMPB)"
              placeholderTextColor={C.sage}
              style={styles.singleGoalSecondaryInput}
              returnKeyType="done"
            />
          </View>

          <Text style={styles.settingsSectionLabel}>CONTRIBUTES TO</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.goalLinkChoices}>
            {weeklyGoals.map((goal) => {
              const colors = categoryColors[goal.category];
              const selected = weeklyGoalId === goal.id;
              return (
                <Pressable
                  key={goal.id}
                  style={[
                    styles.goalLinkChoice,
                    selected && { borderColor: colors.accent, backgroundColor: colors.tint },
                  ]}
                  onPress={() => setWeeklyGoalId(goal.id)}>
                  <View style={[styles.goalHubDot, { backgroundColor: colors.accent }]} />
                  <View style={styles.nativeGoalCopy}>
                    <Text style={styles.goalLinkTitle}>{goal.title}</Text>
                    <Text style={styles.goalLinkMeta}>{goal.target} {goal.unit} each week</Text>
                  </View>
                  {selected && (
                    <SymbolView
                      name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                      size={21}
                      tintColor={colors.accent}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {linkedCategory === 'MOVE' && (
            <>
              <Text style={styles.settingsSectionLabel}>WORKOUT FOCUS · OPTIONAL</Text>
              <View style={styles.bodyAreaCard}>
                <View style={styles.bodyAreaIcon}>
                  <SymbolView
                    name={{ ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' }}
                    size={28}
                    tintColor={C.move}
                  />
                </View>
                <View style={styles.bodyAreaChoices}>
                  {['Full body', 'Chest', 'Back', 'Arms', 'Shoulders', 'Legs', 'Core'].map((area) => {
                    const selected = bodyAreas.includes(area);
                    return (
                      <Pressable
                        key={area}
                        style={[styles.bodyAreaChoice, selected && styles.bodyAreaChoiceSelected]}
                        onPress={() => toggleBodyArea(area)}>
                        <Text style={[styles.bodyAreaChoiceText, selected && styles.bodyAreaChoiceTextSelected]}>
                          {area}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          {linkedCategory === 'FUEL' && (
            <>
              <Text style={styles.settingsSectionLabel}>FOOD · OPTIONAL</Text>
              <View style={styles.metricInputCard}>
                <TextInput
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="Calories"
                  placeholderTextColor={C.sage}
                  keyboardType="number-pad"
                  style={styles.metricNumberInput}
                />
                <Text style={styles.metricSuffix}>kcal</Text>
              </View>
            </>
          )}

          <Text style={styles.settingsSectionLabel}>DAILY MILESTONE · OPTIONAL</Text>
          <View style={styles.dailyMetricCard}>
            <View style={styles.dailyMetricField}>
              <Text style={styles.weeklyFieldLabel}>AMOUNT</Text>
              <TextInput
                value={dailyTarget}
                onChangeText={setDailyTarget}
                placeholder="3"
                placeholderTextColor={C.sage}
                keyboardType="number-pad"
                style={styles.dailyMetricInput}
                maxLength={2}
              />
            </View>
            <View style={styles.weeklyTargetDivider} />
            <View style={[styles.dailyMetricField, styles.dailyMetricUnitField]}>
              <Text style={styles.weeklyFieldLabel}>UNIT</Text>
              <TextInput
                value={dailyUnit}
                onChangeText={setDailyUnit}
                placeholder={linkedCategory === 'FOCUS' ? 'hours' : linkedCategory === 'FUEL' ? 'bottles' : 'sets'}
                placeholderTextColor={C.sage}
                style={styles.dailyMetricInput}
              />
            </View>
          </View>

          <Text style={styles.settingsSectionLabel}>SHOW ON</Text>
          <View style={styles.dailyScheduleCard}>
            <View style={styles.dailyScheduleDays}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => {
                const selected = plannedDays.includes(index + 1);
                const linked = weeklyGoals.find((goal) => goal.id === weeklyGoalId);
                const accent = linked ? categoryColors[linked.category].accent : C.coral;
                return (
                  <Pressable
                    key={`${label}-${index}`}
                    style={[
                      styles.dailyScheduleDay,
                      selected && { backgroundColor: accent, borderColor: accent },
                    ]}
                    onPress={() => toggleDailyDay(index + 1)}>
                    <Text style={[styles.dailyScheduleDayText, selected && styles.weeklyPlanDayTextSelected]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.dailyScheduleHint}>
              This goal only appears on the selected days.
            </Text>
          </View>

          <Text style={styles.settingsSectionLabel}>ALARM · OPTIONAL</Text>
          <View style={styles.singleGoalCard}>
            <View style={styles.simpleAlarmRow}>
              <View style={styles.goalReminderLabel}>
                <SymbolView
                  name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
                  size={18}
                  tintColor={reminder.enabled ? C.coral : C.muted}
                />
                <Text style={styles.goalReminderText}>
                  {reminder.enabled ? formatTime(reminder.hour, reminder.minute) : 'Off'}
                </Text>
              </View>
              <Switch
                value={reminder.enabled}
                onValueChange={(enabled) => setReminder((current) => ({ ...current, enabled }))}
                trackColor={{ false: '#D1D1D6', true: '#9A9CF5' }}
                thumbColor={C.white}
              />
            </View>
            {reminder.enabled && (
              <DateTimePicker
                value={timeAsDate(reminder)}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onValueChange={(_event, date) =>
                  setReminder((current) => ({
                    ...current,
                    hour: date.getHours(),
                    minute: date.getMinutes(),
                    notificationId: undefined,
                  }))
                }
                accentColor={C.coral}
              />
            )}
          </View>

          {existing && (
            <Pressable style={styles.deleteGoalButton} onPress={() => deleteGoal(existing)}>
              <Text style={styles.deleteGoalText}>Delete goal</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const availableIdeas = weeklyGoalIdeas.filter(
    (idea) => !weeklyGoals.some((goal) => goal.id === idea.id),
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.goalHubContent}>
      <Text style={styles.goalHubTitle}>Goals</Text>
      <Pressable style={styles.newGoalButton} onPress={beginNewGoal}>
        <View style={styles.newGoalIcon}>
          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={18} tintColor={C.white} />
        </View>
        <Text style={styles.newGoalText}>Set a new goal</Text>
      </Pressable>

      <Text style={styles.goalHubSection}>Goal calendar</Text>
      <GoalsCalendar goals={goals} />

      <Text style={styles.goalHubSection}>Current daily goals</Text>
      <View style={styles.nativeList}>
        {goals.map((goal, index) => {
          const colors = categoryColors[goal.category];
          const linked = weeklyGoals.find((weeklyGoal) => weeklyGoal.id === goal.weeklyGoalId);
          const dayLabels = (goal.plannedDays ?? [1, 2, 3, 4, 5, 6, 7])
            .map((day) => ['M', 'T', 'W', 'T', 'F', 'S', 'S'][day - 1])
            .join(' · ');
          return (
            <Pressable
              key={goal.id}
              style={[styles.goalHubRow, index === goals.length - 1 && styles.nativeLastRow]}
              onPress={() => beginEditGoal(goal)}>
              <View style={[styles.goalHubDot, { backgroundColor: colors.accent }]} />
              <View style={styles.nativeGoalCopy}>
                <Text style={styles.nativeGoalTitle}>{goal.title}</Text>
                {!!(goal.detail || goal.location) && (
                  <Text style={styles.nativeGoalDetail}>
                    {[goal.detail, goal.location].filter(Boolean).join(' · ')}
                  </Text>
                )}
                {!!(goal.bodyAreas?.length || goal.calories || goal.dailyTarget) && (
                  <Text style={styles.nativeGoalDetail}>
                    {[
                      goal.bodyAreas?.join(', '),
                      goal.calories ? `${goal.calories} kcal` : '',
                      goal.dailyTarget ? `${goal.dailyTarget} ${goal.dailyUnit ?? 'times'}` : '',
                    ].filter(Boolean).join(' · ')}
                  </Text>
                )}
                <Text style={styles.nativeGoalCategory}>
                  {linked?.title ?? 'Not linked'} · {dayLabels}
                  {goal.reminder?.enabled
                    ? ` · ${formatTime(goal.reminder.hour, goal.reminder.minute)}`
                    : ''}
                </Text>
              </View>
              <Text style={styles.settingsArrow}>›</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.goalHubSectionRow}>
        <Text style={[styles.goalHubSection, styles.goalHubSectionInRow]}>Current weekly goals</Text>
        <Pressable style={styles.addWeeklyButton} onPress={beginNewWeeklyGoal}>
          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={14} tintColor={C.coral} />
          <Text style={styles.addWeeklyButtonText}>New weekly goal</Text>
        </Pressable>
      </View>
      <View style={styles.weeklyPlanList}>
        {weeklyGoals.map((goal) => {
          const colors = categoryColors[goal.category];
          const linkedDailyGoals = goals.filter((dailyGoal) => dailyGoal.weeklyGoalId === goal.id);
          const linkedDays = Array.from(
            new Set(linkedDailyGoals.flatMap((dailyGoal) => dailyGoal.plannedDays ?? [])),
          ).sort((a, b) => a - b);
          return (
          <View key={goal.id} style={styles.weeklyPlanCard}>
            <View style={styles.weeklyPlanTop}>
              <View style={styles.nativeGoalCopy}>
                <Text style={styles.nativeGoalTitle}>{goal.title}</Text>
                <Text style={styles.nativeGoalCategory}>{goal.target} {goal.unit} per week</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${goal.title}`}
                style={[styles.weeklyEditButton, { backgroundColor: colors.tint }]}
                onPress={() => beginEditWeeklyGoal(goal)}>
                <SymbolView
                  name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                  size={15}
                  tintColor={colors.accent}
                />
              </Pressable>
            </View>
            <Text style={styles.weeklyPlanLabel}>LINKED DAILY GOALS</Text>
            <Text style={styles.weeklyLinkedSummary}>
              {linkedDailyGoals.length
                ? `${linkedDailyGoals.length} ${linkedDailyGoals.length === 1 ? 'goal' : 'goals'} · ${linkedDays
                    .map((day) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day - 1])
                    .join(', ')}`
                : 'None yet — create a daily goal to schedule it'}
            </Text>
          </View>
          );
        })}
      </View>

      {!!availableIdeas.length && (
        <>
          <Text style={styles.goalHubSection}>Weekly goal ideas</Text>
          <View style={styles.weeklyIdeas}>
            {availableIdeas.map((idea) => {
              const colors = categoryColors[idea.category];
              return (
                <Pressable
                  key={idea.id}
                  style={[styles.weeklyIdea, { backgroundColor: colors.tint }]}
                  onPress={() => addWeeklyGoal(idea)}>
                  <View style={styles.weeklyIdeaCopy}>
                    <Text style={[styles.weeklyIdeaTitle, { color: colors.accent }]}>{idea.title}</Text>
                    <Text style={styles.weeklyIdeaMeta}>{idea.target} {idea.unit} per week</Text>
                  </View>
                  <SymbolView
                    name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
                    size={24}
                    tintColor={colors.accent}
                  />
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function CommunityScreen({
  posts,
  reacted,
  onReact,
  friends,
  setFriends,
}: {
  posts: Post[];
  reacted: Record<string, Reaction[]>;
  onReact: (postId: string, reaction: Reaction) => void;
  friends: Friend[];
  setFriends: React.Dispatch<React.SetStateAction<Friend[]>>;
}) {
  const [section, setSection] = useState<'activity' | 'people'>('activity');
  const navigation = (
    <View style={styles.communityTabs}>
      <Pressable
        style={[styles.communityTab, section === 'activity' && styles.communityTabActive]}
        onPress={() => setSection('activity')}>
        <Text style={[styles.communityTabText, section === 'activity' && styles.communityTabTextActive]}>
          Activity
        </Text>
      </Pressable>
      <Pressable
        style={[styles.communityTab, section === 'people' && styles.communityTabActive]}
        onPress={() => setSection('people')}>
        <Text style={[styles.communityTabText, section === 'people' && styles.communityTabTextActive]}>
          Find friends
        </Text>
      </Pressable>
    </View>
  );

  return section === 'activity' ? (
    <FeedScreen posts={posts} reacted={reacted} onReact={onReact} communityNavigation={navigation} />
  ) : (
    <FriendsScreen friends={friends} setFriends={setFriends} communityNavigation={navigation} />
  );
}

function FeedScreen({
  posts,
  reacted,
  onReact,
  communityNavigation,
}: {
  posts: Post[];
  reacted: Record<string, Reaction[]>;
  onReact: (postId: string, reaction: Reaction) => void;
  communityNavigation?: React.ReactNode;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {communityNavigation}
      <Header
        label="YOUR COMMUNITY"
        title="Friends showing up."
        action={<View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>}
      />
      <View style={styles.feedFilter}>
        <Pressable style={styles.filterActive}><Text style={styles.filterActiveText}>Friends</Text></Pressable>
        <Pressable style={styles.filterInactive}><Text style={styles.filterText}>Mine</Text></Pressable>
      </View>
      {posts.filter((post) => post.shared !== false).map((post) => (
        <View key={post.id} style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={[styles.avatar, { backgroundColor: post.avatarColor }]}>
              <Text style={styles.avatarTextLight}>{post.initials}</Text>
            </View>
            <View style={styles.postPerson}>
              <View style={styles.postNameRow}>
                <Text style={styles.postName}>{post.author}</Text>
                {post.mine && <Text style={styles.youTag}>YOU</Text>}
              </View>
              <Text style={styles.postTime}>{post.username} · {post.time}</Text>
            </View>
            <Text style={styles.more}>•••</Text>
          </View>
          {post.image ? (
            <Image source={{ uri: post.image }} style={styles.postImage} alt={`${post.author}'s activity proof`} />
          ) : (
            <View style={[styles.postPhoto, { backgroundColor: post.photoColor }]}>
              <Text style={styles.photoEmoji}>{post.photoEmoji}</Text>
              <View style={styles.photoStamp}>
                <Text style={styles.photoStampText}>PROOF KEPT</Text>
              </View>
            </View>
          )}
          <View style={styles.postBody}>
            <Text style={styles.postCategory}>{post.category} · COMPLETED</Text>
            <Text style={styles.postActivity}>{post.activity}</Text>
            <Text style={styles.postDuration}>{post.duration}</Text>
            <Text style={styles.postCaption}>{post.caption}</Text>
            <View style={styles.reactionRow}>
              <Pressable
                style={[styles.reaction, reacted[post.id]?.includes('heart') && styles.reactionOn]}
                onPress={() => onReact(post.id, 'heart')}>
                <Text style={styles.reactionIcon}>♥</Text>
                <Text style={styles.reactionText}>{post.reactions.heart}</Text>
              </Pressable>
              <Pressable
                style={[styles.reaction, reacted[post.id]?.includes('kudos') && styles.reactionOn]}
                onPress={() => onReact(post.id, 'kudos')}>
                <Text style={styles.reactionIcon}>✦</Text>
                <Text style={styles.reactionText}>{post.reactions.kudos} kudos</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const moodOptions = [
  { id: 'tough', face: '😣', label: 'Tough', caption: 'It was tough, but I showed up.' },
  { id: 'hard', face: '😕', label: 'Hard', caption: 'Hard today. Still completed.' },
  { id: 'okay', face: '😐', label: 'Okay', caption: 'Done. One promise kept.' },
  { id: 'good', face: '🙂', label: 'Good', caption: 'Felt good to follow through.' },
  { id: 'great', face: '😄', label: 'Great', caption: 'Felt great. Glad I showed up.' },
] as const;

function LogScreen({
  user,
  selectedGoal,
  goals,
  onPublish,
}: {
  user: User;
  selectedGoal: Goal | null;
  goals: Goal[];
  onPublish: (post: Post) => void;
}) {
  const initial = selectedGoal ?? goals.find((goal) => !goal.done) ?? goals[0];
  const [photo, setPhoto] = useState<string | null>(null);
  const [mood, setMood] = useState<(typeof moodOptions)[number]['id'] | null>(null);
  const [shareWithFriends, setShareWithFriends] = useState(true);
  const activeGoal = initial;

  async function takeSelfie() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission needed', 'Allow camera access to take your completion selfie.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
      cameraType: ImagePicker.CameraType.front,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }

  const ready = Boolean(mood);
  function share() {
    if (!ready) return;
    const selectedMood = moodOptions.find((option) => option.id === mood);
    if (!selectedMood) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onPublish({
      id: `mine-${Date.now()}`,
      author: user.name,
      username: user.username,
      initials: initials(user.name),
      avatarColor: C.ink,
      activity: activeGoal.title,
      category: activeGoal.category,
      caption: selectedMood.caption,
      image: photo ?? undefined,
      photoColor: photo ? undefined : C.focusTint,
      photoEmoji: photo ? undefined : selectedMood.face,
      time: 'Just now',
      duration: 'Completed today',
      reactions: { heart: 0, kudos: 0 },
      mine: true,
      shared: shareWithFriends,
    });
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Header label="PROMISE KEPT" title="Complete it." />
      <View style={styles.completionGoalCard}>
        <Text style={styles.completionGoalCategory}>{activeGoal.category}</Text>
        <Text style={styles.completionGoalTitle}>{activeGoal.title}</Text>
      </View>

      <View style={styles.photoPicker}>
        {photo ? (
          <>
            <Image source={{ uri: photo }} style={styles.selectedPhoto} alt="Completion selfie" />
            <Pressable style={styles.replacePhoto} onPress={takeSelfie}>
              <Text style={styles.replaceText}>Retake selfie</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.emptyPhoto}>
            <View style={styles.cameraCircle}>
              <SymbolView name={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }} size={28} tintColor={C.ink} />
            </View>
            <Text style={styles.photoTitle}>Add a selfie</Text>
            <Text style={styles.photoHint}>Optional. Complete the check-in without one if you prefer.</Text>
            <View style={styles.photoActions}>
              <Pressable style={styles.cameraButton} onPress={takeSelfie}>
                <Text style={styles.cameraButtonText}>Take optional selfie</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <Text style={styles.fieldLabel}>HOW DID IT GO?</Text>
      <View style={styles.moodGrid}>
        {moodOptions.map((option) => (
          <Pressable
            key={option.id}
            style={[styles.moodOption, mood === option.id && styles.moodOptionActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setMood(option.id);
            }}>
            <Text style={styles.moodFace}>{option.face}</Text>
            <Text style={[styles.moodLabel, mood === option.id && styles.moodLabelActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.shareChoiceCard}>
        <View style={styles.shareChoiceCopy}>
          <Text style={styles.shareChoiceTitle}>Share with friends</Text>
          <Text style={styles.shareChoiceText}>
            {shareWithFriends
              ? photo
                ? 'Friends can see this selfie and send encouragement.'
                : 'Friends will see a simple completion update without a photo.'
              : 'Only you will see this completion in your history.'}
          </Text>
        </View>
        <Switch
          value={shareWithFriends}
          onValueChange={setShareWithFriends}
          trackColor={{ false: '#D1D1D6', true: '#9A9CF5' }}
          thumbColor={C.white}
        />
      </View>
      <Pressable disabled={!ready} style={[styles.shareButton, !ready && styles.disabled]} onPress={share}>
        <Text style={styles.shareButtonText}>
          {shareWithFriends ? 'Complete & share' : 'Complete privately'}
        </Text>
        <Text style={styles.shareButtonText}>→</Text>
      </Pressable>
      <Text style={styles.shareNote}>
        {shareWithFriends
          ? 'Shared with friends only. They can respond with hearts and kudos.'
          : 'Private completion. Nothing will be posted to Community.'}
      </Text>
    </ScrollView>
  );
}

function FriendsScreen({
  friends,
  setFriends,
  communityNavigation,
}: {
  friends: Friend[];
  setFriends: React.Dispatch<React.SetStateAction<Friend[]>>;
  communityNavigation?: React.ReactNode;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () =>
      friends.filter((friend) =>
        `${friend.name} ${friend.username}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [friends, query],
  );
  const currentFriends = friends.filter((friend) => friend.added);

  function toggleFriend(id: string) {
    setFriends((current) =>
      current.map((friend) =>
        friend.id === id ? { ...friend, added: !friend.added } : friend,
      ),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {communityNavigation}
      <Header label="YOUR PEOPLE" title="Better with friends." />
      <View style={styles.search}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Find by name or username"
          placeholderTextColor="#8E948D"
          style={styles.searchInput}
          autoCapitalize="none"
        />
      </View>

      {!query && (
        <>
          <View style={styles.sectionRow}>
            <Text style={styles.eyebrow}>YOUR FRIENDS</Text>
            <Text style={styles.sectionMeta}>{currentFriends.length} PEOPLE</Text>
          </View>
          <View style={styles.friendFaces}>
            {currentFriends.map((friend) => (
              <View key={friend.id} style={styles.friendFace}>
                <View style={[styles.largeAvatar, { backgroundColor: friend.color }]}>
                  <Text style={styles.largeAvatarText}>{friend.initials}</Text>
                </View>
                <Text style={styles.faceName}>{friend.name.split(' ')[0]}</Text>
              </View>
            ))}
            <View style={styles.friendFace}>
              <View style={styles.inviteCircle}><Text style={styles.invitePlus}>＋</Text></View>
              <Text style={styles.faceName}>Invite</Text>
            </View>
          </View>
        </>
      )}

      <View style={styles.sectionRow}>
        <Text style={styles.eyebrow}>{query ? 'SEARCH RESULTS' : 'PEOPLE YOU MAY KNOW'}</Text>
      </View>
      <View style={styles.peopleCard}>
        {filtered.map((friend, index) => (
          <View key={friend.id} style={[styles.personRow, index === filtered.length - 1 && styles.noBorder]}>
            <View style={[styles.avatar, { backgroundColor: friend.color }]}>
              <Text style={styles.avatarTextLight}>{friend.initials}</Text>
            </View>
            <View style={styles.personCopy}>
              <Text style={styles.personName}>{friend.name}</Text>
              <Text style={styles.personMeta}>{friend.username} · {friend.mutual} mutual</Text>
            </View>
            <Pressable
              style={[styles.addFriend, friend.added && styles.addedFriend]}
              onPress={() => toggleFriend(friend.id)}>
              <Text style={[styles.addFriendText, friend.added && styles.addedFriendText]}>
                {friend.added ? 'Added' : 'Add'}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
      <View style={styles.privacyCard}>
        <Text style={styles.privacyIcon}>◉</Text>
        <View style={styles.privacyCopy}>
          <Text style={styles.privacyTitle}>Friends-only by default</Text>
          <Text style={styles.privacyText}>Only accepted friends can see your activity posts and completion history.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function ProfileScreen({
  user,
  goals,
  posts,
  friends,
  onOpenReminders,
}: {
  user: User;
  goals: Goal[];
  posts: Post[];
  friends: Friend[];
  onOpenReminders: () => void;
}) {
  const mine = posts.filter((post) => post.mine);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.profileTop}>
        <View style={styles.profileAvatar}><Text style={styles.profileInitials}>{initials(user.name)}</Text></View>
        <Text style={styles.profileName}>{user.name}</Text>
        <Text style={styles.profileUsername}>{user.username}</Text>
        <Text style={styles.profileBio}>Doing what I said I would do.</Text>
      </View>
      <View style={styles.statsCard}>
        <View style={styles.stat}><Text style={styles.statValue}>12</Text><Text style={styles.statLabel}>DAY STREAK</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.stat}><Text style={styles.statValue}>{goals.filter((g) => g.done).length + 26}</Text><Text style={styles.statLabel}>KEPT</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.stat}><Text style={styles.statValue}>{friends.filter((f) => f.added).length}</Text><Text style={styles.statLabel}>FRIENDS</Text></View>
      </View>
      <View style={styles.sectionRow}>
        <View><Text style={styles.eyebrow}>YOUR PROOF</Text><Text style={styles.sectionTitle}>Recent completions</Text></View>
      </View>
      {mine.length ? (
        mine.map((post) => (
          <View key={post.id} style={styles.miniPost}>
            {post.image && <Image source={{ uri: post.image }} style={styles.miniImage} alt={`${post.activity} proof`} />}
            <View style={styles.miniCopy}>
              <Text style={styles.postCategory}>{post.category} · COMPLETED</Text>
              <Text style={styles.miniTitle}>{post.activity}</Text>
              <Text style={styles.postTime}>{post.time}</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyProof}>
          <SymbolView name={{ ios: 'photo', android: 'image', web: 'image' }} size={38} tintColor={C.sage} />
          <Text style={styles.emptyProofTitle}>Your proof will live here.</Text>
          <Text style={styles.emptyProofText}>Complete an activity and share your first photo.</Text>
        </View>
      )}
      <View style={styles.settingsCard}>
        {[
          { label: 'Account & privacy' },
          { label: 'Reminder settings', action: onOpenReminders },
          { label: 'Community guidelines' },
        ].map((item) => (
          <Pressable key={item.label} style={styles.settingsRow} onPress={item.action}>
            <Text style={styles.settingsText}>{item.label}</Text><Text style={styles.settingsArrow}>›</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

type ReminderName = 'morning' | 'evening';
type ReminderState = {
  enabled: boolean;
  hour: number;
  minute: number;
  notificationId?: string;
};

const reminderStorageKey = 'be-discipline-reminders-v1';
const defaultReminders: Record<ReminderName, ReminderState> = {
  morning: { enabled: false, hour: 8, minute: 0 },
  evening: { enabled: false, hour: 20, minute: 30 },
};

async function ensureNotificationPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('discipline-reminders', {
      name: 'Goal reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: C.coral,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

function RemindersScreen({ onBack }: { onBack: () => void }) {
  const [reminders, setReminders] = useState(defaultReminders);
  const [editing, setEditing] = useState<ReminderName | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(reminderStorageKey)
      .then((value) => value && setReminders(JSON.parse(value)))
      .finally(() => setReady(true));
  }, []);

  async function saveReminder(name: ReminderName, next: ReminderState) {
    const updated = { ...reminders, [name]: next };
    setReminders(updated);
    await AsyncStorage.setItem(reminderStorageKey, JSON.stringify(updated));
  }

  async function toggleReminder(name: ReminderName) {
    const current = reminders[name];
    if (current.enabled) {
      if (current.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(current.notificationId);
      }
      await saveReminder(name, { ...current, enabled: false, notificationId: undefined });
      return;
    }

    const granted = await ensureNotificationPermission();
    if (!granted) {
      Alert.alert(
        'Notifications are off',
        'Allow notifications in your phone settings to use daily reminders.',
      );
      return;
    }
    const notificationId = await scheduleDailyReminder(name, current.hour, current.minute);
    await saveReminder(name, { ...current, enabled: true, notificationId });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function changeTime(name: ReminderName, date: Date) {
    const current = reminders[name];
    if (current.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(current.notificationId);
    }
    const next = { ...current, hour: date.getHours(), minute: date.getMinutes() };
    const notificationId = current.enabled
      ? await scheduleDailyReminder(name, next.hour, next.minute)
      : undefined;
    await saveReminder(name, { ...next, notificationId });
  }

  if (!ready) {
    return <View style={styles.reminderLoading}><ActivityIndicator color={C.coral} /></View>;
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Pressable style={styles.reminderBack} onPress={onBack}>
        <Text style={styles.back}>← Profile</Text>
      </Pressable>
      <Header label="DAILY RHYTHM" title="Reminders that help." />
      <Text style={styles.reminderIntro}>
        Gentle prompts, scheduled on this phone. These work without a community backend.
      </Text>

      <View style={styles.reminderCard}>
        <ReminderRow
          icon="☀"
          title="Morning commitment"
          description="Review today's promises before the day gets busy."
          reminder={reminders.morning}
          onToggle={() => toggleReminder('morning')}
          onEdit={() => setEditing(editing === 'morning' ? null : 'morning')}
        />
        <ReminderRow
          icon="◐"
          title="Evening check-in"
          description="Take a selfie, choose how it felt, and close the day."
          reminder={reminders.evening}
          onToggle={() => toggleReminder('evening')}
          onEdit={() => setEditing(editing === 'evening' ? null : 'evening')}
          last
        />
      </View>

      {editing && (
        <View style={styles.timePickerCard}>
          <Text style={styles.fieldLabel}>
            {editing === 'morning' ? 'MORNING COMMITMENT' : 'EVENING CHECK-IN'}
          </Text>
          <DateTimePicker
            value={timeAsDate(reminders[editing])}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={(_event, date) => changeTime(editing, date)}
            onDismiss={() => {
              if (Platform.OS === 'android') setEditing(null);
            }}
            accentColor={C.coral}
          />
          {Platform.OS === 'ios' && (
            <Pressable style={styles.timeDone} onPress={() => setEditing(null)}>
              <Text style={styles.timeDoneText}>Done</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.reminderNote}>
        <Text style={styles.reminderNoteIcon}>i</Text>
        <Text style={styles.reminderNoteText}>
          Your phone controls final delivery. Focus modes, battery settings, and notification
          permissions may silence a reminder.
        </Text>
      </View>
    </ScrollView>
  );
}

function ReminderRow({
  icon,
  title,
  description,
  reminder,
  onToggle,
  onEdit,
  last,
}: {
  icon: string;
  title: string;
  description: string;
  reminder: ReminderState;
  onToggle: () => void;
  onEdit: () => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.reminderRow, last && styles.noBorder]}>
      <View style={styles.reminderIcon}><Text style={styles.reminderIconText}>{icon}</Text></View>
      <View style={styles.reminderCopy}>
        <Text style={styles.reminderTitle}>{title}</Text>
        <Text style={styles.reminderDescription}>{description}</Text>
        <Pressable onPress={onEdit}>
          <Text style={styles.reminderTime}>{formatTime(reminder.hour, reminder.minute)} · Change</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: reminder.enabled }}
        style={[styles.toggle, reminder.enabled && styles.toggleOn]}
        onPress={onToggle}>
        <View style={[styles.toggleKnob, reminder.enabled && styles.toggleKnobOn]} />
      </Pressable>
    </View>
  );
}

async function scheduleDailyReminder(name: ReminderName, hour: number, minute: number) {
  const morning = name === 'morning';
  return Notifications.scheduleNotificationAsync({
    content: {
      title: morning ? 'Make today intentional.' : 'Close the loop.',
      body: morning
        ? 'Review the promises you chose for today.'
        : 'Take a selfie and complete your evening check-in.',
      sound: true,
      data: { screen: morning ? 'today' : 'log' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'discipline-reminders',
    },
  });
}

async function scheduleGoalReminders(goal: Goal) {
  const reminder = goal.reminder;
  if (!reminder) throw new Error('Cannot schedule a goal without a reminder time.');
  const plannedDays = goal.plannedDays ?? [1, 2, 3, 4, 5, 6, 7];
  return Promise.all(
    plannedDays.map((day) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: `Time for ${goal.title}`,
          body: goal.detail || 'You planned this. Start small and show up.',
          sound: true,
          data: { screen: 'today', goalId: goal.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day === 7 ? 1 : day + 1,
          hour: reminder.hour,
          minute: reminder.minute,
          channelId: 'discipline-reminders',
        },
      }),
    ),
  );
}

function timeAsDate(reminder: { hour: number; minute: number }) {
  const date = new Date();
  date.setHours(reminder.hour, reminder.minute, 0, 0);
  return date;
}

function formatTime(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function BottomNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const items = [
    { id: 'today', symbol: { ios: 'checklist', android: 'checklist', web: 'checklist' }, label: 'Today' },
    { id: 'feed', symbol: { ios: 'person.2.fill', android: 'groups', web: 'groups' }, label: 'Community' },
    { id: 'goal-settings', symbol: { ios: 'target', android: 'track_changes', web: 'track_changes' }, label: 'Goals' },
    { id: 'profile', symbol: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }, label: 'Me' },
  ] as const;
  return (
    <View style={styles.bottomNav}>
      {items.map((item) => {
        const active =
          tab === item.id ||
          (item.id === 'profile' && tab === 'reminders') ||
          (item.id === 'today' && tab === 'log');
        return (
          <Pressable key={item.id} style={styles.navItem} onPress={() => onChange(item.id)}>
            <SymbolView name={item.symbol} size={22} tintColor={active ? C.coral : C.muted} />
            <Text style={[styles.navLabel, active && styles.navActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.cream },
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: C.cream },
  logoBlock: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink },
  logoLetters: { color: C.white, fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 36 },
  onboarding: { flex: 1, backgroundColor: C.cream },
  onboardArt: { height: 270, backgroundColor: C.ink, overflow: 'hidden', justifyContent: 'flex-end', padding: 28 },
  onboardSquare: { position: 'absolute', width: 175, height: 175, right: -35, top: 8, backgroundColor: C.sage, opacity: 0.85 },
  onboardRing: { position: 'absolute', width: 230, height: 230, borderRadius: 115, borderWidth: 42, borderColor: C.coral, right: -80, bottom: -35 },
  onboardMini: { color: C.cream, fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  onboardBody: { flex: 1, paddingHorizontal: 28, paddingTop: 34, paddingBottom: 20, justifyContent: 'flex-start' },
  eyebrow: { color: C.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1.6, marginBottom: 10 },
  onboardTitle: { color: C.inkDark, fontSize: 42, lineHeight: 45, fontWeight: '800', letterSpacing: -1.5, marginBottom: 16 },
  onboardText: { color: C.muted, fontSize: 14, lineHeight: 21, marginBottom: 20 },
  primaryButton: { height: 56, paddingHorizontal: 20, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryButtonText: { color: C.white, fontSize: 13, fontWeight: '900', letterSpacing: 0.4 },
  demoButton: { alignItems: 'center', padding: 18 },
  demoButtonText: { color: C.ink, fontSize: 13, fontWeight: '800', textDecorationLine: 'underline' },
  accountScreen: { flex: 1, padding: 24, justifyContent: 'space-between' },
  back: { color: C.ink, fontSize: 13, fontWeight: '800', marginTop: 6 },
  accountTitle: { color: C.inkDark, fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -1.4 },
  formGroup: { gap: 10 },
  fieldLabel: { color: C.ink, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginTop: 10, marginBottom: 7 },
  input: { height: 52, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper, paddingHorizontal: 15, color: C.inkDark, fontSize: 15 },
  usernameInput: { height: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, backgroundColor: C.paper, paddingHorizontal: 15 },
  at: { color: C.coral, fontWeight: '900', fontSize: 16 },
  usernameText: { flex: 1, height: '100%', paddingHorizontal: 6, color: C.inkDark, fontSize: 15 },
  disabled: { opacity: 0.35 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 26 },
  headerTitle: { color: C.inkDark, fontSize: 32, lineHeight: 36, fontWeight: '800', letterSpacing: -1 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.ink },
  avatarText: { color: C.ink, fontSize: 11, fontWeight: '900' },
  avatarTextLight: { color: C.white, fontSize: 11, fontWeight: '900' },
  nativeTodayContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 36 },
  nativeTodayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  nativeTodayTitle: { color: C.inkDark, fontSize: 34, lineHeight: 39, fontWeight: '800', letterSpacing: -1 },
  nativeTodayDate: { color: C.muted, fontSize: 13, marginTop: 3 },
  nativeAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.focusTint, alignItems: 'center', justifyContent: 'center' },
  weekCalendar: { backgroundColor: C.paper, borderRadius: 16, flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 12, marginBottom: 26 },
  weekCalendarDay: { flex: 1, alignItems: 'center', gap: 5 },
  weekCalendarLabel: { color: C.muted, fontSize: 9, fontWeight: '700' },
  weekCalendarLabelToday: { color: C.focus },
  weekCalendarDate: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  weekCalendarDateToday: { backgroundColor: C.focus },
  weekCalendarNumber: { color: C.inkDark, fontSize: 12, fontWeight: '600' },
  weekCalendarNumberToday: { color: C.white, fontWeight: '800' },
  weekCalendarDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  weekCalendarDotDone: { backgroundColor: C.move },
  nativeAvatarText: { color: C.focus, fontSize: 12, fontWeight: '700' },
  nativeSectionHeader: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  nativeSectionTitle: { color: C.inkDark, fontSize: 17, fontWeight: '700' },
  nativeSectionActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  nativeSectionMeta: { color: C.muted, fontSize: 13 },
  nativeEditText: { color: C.coral, fontSize: 14, fontWeight: '600' },
  nativeProgressTrack: { height: 4, backgroundColor: '#DCDCE1', borderRadius: 2, marginHorizontal: 4, marginTop: 8, marginBottom: 14, overflow: 'hidden' },
  nativeProgressFill: { height: '100%', backgroundColor: C.coral, borderRadius: 2 },
  nativeList: { backgroundColor: C.paper, borderRadius: 12, paddingLeft: 16, marginBottom: 30, overflow: 'hidden' },
  nativeGoalRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, paddingRight: 12 },
  nativeLastRow: { borderBottomWidth: 0 },
  nativeStatusCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.sage, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  nativeStatusCircleDone: { backgroundColor: C.coral, borderColor: C.coral },
  nativeGoalCopy: { flex: 1, paddingVertical: 13 },
  nativeGoalTitle: { color: C.inkDark, fontSize: 15, fontWeight: '600' },
  nativeGoalTitleDone: { color: C.muted, textDecorationLine: 'line-through' },
  nativeGoalDetail: { color: C.muted, fontSize: 12, lineHeight: 16, marginTop: 3 },
  nativeGoalCategory: { color: C.muted, fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
  nativeDoneButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.blush, borderRadius: 17, paddingHorizontal: 12 },
  nativeDoneText: { color: C.coral, fontSize: 13, fontWeight: '600' },
  milestoneControl: { alignItems: 'center', minWidth: 58 },
  milestoneCount: { fontSize: 15, fontWeight: '800' },
  milestoneUnit: { color: C.muted, fontSize: 9, marginTop: 1, marginBottom: 5, maxWidth: 62 },
  milestoneAdd: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  nativePressed: { opacity: 0.55 },
  noGoalsToday: { minHeight: 92, justifyContent: 'center', paddingRight: 16 },
  noGoalsTodayTitle: { color: C.inkDark, fontSize: 15, fontWeight: '700' },
  noGoalsTodayText: { color: C.muted, fontSize: 12, marginTop: 4 },
  nativeWeekRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, paddingRight: 16 },
  nativeWeekIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  nativeWeekCount: { color: C.muted, fontSize: 13, fontWeight: '600' },
  weeklyDashboardList: { gap: 12, marginTop: 10, marginBottom: 8 },
  weeklyDashboardCard: { backgroundColor: C.paper, borderRadius: 16, padding: 16 },
  weeklyDashboardTop: { flexDirection: 'row', alignItems: 'center' },
  weeklyDashboardTitle: { color: C.inkDark, fontSize: 17, fontWeight: '700' },
  weeklyDashboardStatus: { color: C.muted, fontSize: 12, marginTop: 4 },
  weeklyDashboardCount: { fontSize: 25, fontWeight: '800', letterSpacing: -0.7 },
  weeklyDashboardTarget: { color: C.muted, fontSize: 14, fontWeight: '600' },
  weeklyProgressTrack: { height: 5, borderRadius: 3, backgroundColor: C.cream, overflow: 'hidden', marginTop: 4, marginBottom: 15 },
  weeklyProgressFill: { height: '100%', borderRadius: 3 },
  weeklyDays: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  weeklyDay: { alignItems: 'center', gap: 5 },
  weeklyDayLabel: { color: C.muted, fontSize: 9, fontWeight: '700' },
  weeklyDayCircle: { width: 29, height: 29, borderRadius: 15, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  weeklyDayNumber: { color: C.muted, fontSize: 10, fontWeight: '600' },
  weeklyDoneButton: { minHeight: 38, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  weeklyDoneText: { fontSize: 13, fontWeight: '700' },
  goalSettingsScreen: { flex: 1, backgroundColor: C.cream },
  settingsNav: { height: 52, backgroundColor: C.paper, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingsNavTitle: { color: C.inkDark, fontSize: 17, fontWeight: '700' },
  settingsNavAction: { color: C.coral, fontSize: 16 },
  settingsSave: { fontWeight: '700' },
  singleGoalContent: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 40 },
  singleGoalCard: { backgroundColor: C.paper, borderRadius: 12, paddingHorizontal: 16, marginBottom: 28, overflow: 'hidden' },
  singleGoalInput: { minHeight: 56, color: C.inkDark, fontSize: 17 },
  singleGoalSecondaryInput: { minHeight: 52, color: C.inkDark, fontSize: 14 },
  singleGoalDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.line },
  weeklyEditorCard: { backgroundColor: C.paper, borderRadius: 12, paddingHorizontal: 16, marginBottom: 28, overflow: 'hidden' },
  weeklyEditorTitle: { minHeight: 58, color: C.inkDark, fontSize: 17, fontWeight: '600' },
  weeklyEditorDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.line },
  weeklyTargetFields: { minHeight: 78, flexDirection: 'row', alignItems: 'stretch' },
  weeklyTargetField: { width: 92, justifyContent: 'center' },
  weeklyUnitField: { flex: 1, width: undefined, paddingLeft: 16 },
  weeklyTargetDivider: { width: StyleSheet.hairlineWidth, backgroundColor: C.line, marginVertical: 12 },
  weeklyFieldLabel: { color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  weeklyTargetInput: { color: C.inkDark, fontSize: 18, fontWeight: '700', paddingVertical: 3 },
  weeklyCategoryChoices: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  weeklyCategoryChoice: { flex: 1, height: 42, borderRadius: 10, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' },
  weeklyCategoryChoiceText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  weeklyCategoryChoiceTextSelected: { color: C.white },
  weeklyEditorNote: { backgroundColor: C.focusTint, borderRadius: 12, padding: 14, marginBottom: 28 },
  weeklyEditorNoteText: { color: C.focus, fontSize: 12, lineHeight: 17 },
  goalLinkChoices: { gap: 8, paddingRight: 16, marginBottom: 28 },
  goalLinkChoice: { width: 172, minHeight: 68, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: C.paper, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 },
  goalLinkTitle: { color: C.inkDark, fontSize: 14, fontWeight: '700' },
  goalLinkMeta: { color: C.muted, fontSize: 11, marginTop: 3 },
  dailyScheduleCard: { backgroundColor: C.paper, borderRadius: 12, padding: 16, marginBottom: 28 },
  dailyScheduleDays: { flexDirection: 'row', justifyContent: 'space-between' },
  dailyScheduleDay: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  dailyScheduleDayText: { color: C.muted, fontSize: 11, fontWeight: '700' },
  dailyScheduleHint: { color: C.muted, fontSize: 11, marginTop: 12 },
  bodyAreaCard: { backgroundColor: C.paper, borderRadius: 12, flexDirection: 'row', padding: 14, gap: 14, marginBottom: 28 },
  bodyAreaIcon: { width: 54, minHeight: 100, borderRadius: 12, backgroundColor: C.moveTint, alignItems: 'center', justifyContent: 'center' },
  bodyAreaChoices: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  bodyAreaChoice: { minHeight: 31, borderRadius: 16, backgroundColor: C.cream, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  bodyAreaChoiceSelected: { backgroundColor: C.move },
  bodyAreaChoiceText: { color: C.muted, fontSize: 11, fontWeight: '600' },
  bodyAreaChoiceTextSelected: { color: C.white },
  metricInputCard: { minHeight: 58, borderRadius: 12, backgroundColor: C.paper, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 28 },
  metricNumberInput: { flex: 1, color: C.inkDark, fontSize: 17, fontWeight: '600' },
  metricSuffix: { color: C.muted, fontSize: 13 },
  dailyMetricCard: { minHeight: 76, backgroundColor: C.paper, borderRadius: 12, flexDirection: 'row', paddingHorizontal: 16, marginBottom: 28 },
  dailyMetricField: { width: 92, justifyContent: 'center' },
  dailyMetricUnitField: { flex: 1, width: undefined, paddingLeft: 16 },
  dailyMetricInput: { color: C.inkDark, fontSize: 17, fontWeight: '600', paddingVertical: 3 },
  simpleAlarmRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deleteGoalButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, borderRadius: 12 },
  deleteGoalText: { color: '#D23B3B', fontSize: 15, fontWeight: '600' },
  goalHubContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 },
  goalHubTitle: { color: C.inkDark, fontSize: 34, lineHeight: 39, fontWeight: '800', letterSpacing: -1, marginBottom: 22 },
  newGoalButton: { minHeight: 58, borderRadius: 14, backgroundColor: C.coral, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 30 },
  newGoalIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.18)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  newGoalText: { color: C.white, fontSize: 17, fontWeight: '700' },
  goalHubSection: { color: C.inkDark, fontSize: 17, fontWeight: '700', marginLeft: 4, marginBottom: 10 },
  goalsCalendarCard: { backgroundColor: C.paper, borderRadius: 16, padding: 16, marginBottom: 28 },
  goalsCalendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  goalsCalendarTitle: { color: C.inkDark, fontSize: 16, fontWeight: '700' },
  goalsCalendarNav: { flexDirection: 'row', gap: 7 },
  calendarNavButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  calendarNavText: { color: C.coral, fontSize: 21, lineHeight: 23, fontWeight: '600' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarWeekday: { width: '14.285%', color: C.muted, fontSize: 9, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  calendarDayCell: { width: '14.285%', height: 43, alignItems: 'center' },
  calendarDayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  calendarDaySelected: { backgroundColor: C.focus },
  calendarDayCompleted: { backgroundColor: C.move },
  calendarDayText: { color: C.inkDark, fontSize: 11, fontWeight: '600' },
  calendarDayTextSelected: { color: C.white },
  calendarPlanDot: { width: 3, height: 3, borderRadius: 2, marginTop: 3, backgroundColor: 'transparent' },
  calendarPlanDotActive: { backgroundColor: C.coral },
  calendarSelection: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, paddingTop: 12, marginTop: 4 },
  calendarSelectionDate: { color: C.inkDark, fontSize: 12, fontWeight: '700' },
  calendarSelectionGoals: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  goalHubSectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  goalHubSectionInRow: { marginBottom: 0 },
  addWeeklyButton: { minHeight: 32, borderRadius: 16, backgroundColor: C.blush, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10 },
  addWeeklyButtonText: { color: C.coral, fontSize: 11, fontWeight: '700' },
  goalHubRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, paddingRight: 16 },
  goalHubDot: { width: 10, height: 10, borderRadius: 5, marginRight: 13 },
  weeklyPlanList: { gap: 10, marginBottom: 30 },
  weeklyPlanCard: { backgroundColor: C.paper, borderRadius: 14, paddingHorizontal: 16, paddingBottom: 15 },
  weeklyPlanTop: { minHeight: 66, flexDirection: 'row', alignItems: 'center' },
  weeklyEditButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  weeklyPlanLabel: { color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginBottom: 9 },
  weeklyLinkedSummary: { color: C.inkDark, fontSize: 12, lineHeight: 17 },
  weeklyPlanDays: { flexDirection: 'row', justifyContent: 'space-between' },
  weeklyPlanDay: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  weeklyPlanDayText: { color: C.muted, fontSize: 11, fontWeight: '700' },
  weeklyPlanDayTextSelected: { color: C.white },
  weeklyIdeas: { gap: 10, marginBottom: 8 },
  weeklyIdea: { minHeight: 64, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  weeklyIdeaCopy: { flex: 1 },
  weeklyIdeaTitle: { fontSize: 15, fontWeight: '700' },
  weeklyIdeaMeta: { color: C.muted, fontSize: 12, marginTop: 3 },
  goalSettingsContent: { paddingHorizontal: 16, paddingTop: 26, paddingBottom: 40 },
  settingsSectionLabel: { color: C.muted, fontSize: 12, marginLeft: 16, marginBottom: 8 },
  goalEditorList: { backgroundColor: C.paper, borderRadius: 12, paddingLeft: 16, overflow: 'hidden' },
  goalEditorRow: { paddingVertical: 16, paddingRight: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  goalEditorTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalFieldLabel: { flex: 1, color: C.muted, fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 5 },
  goalFieldOptional: { color: C.sage, fontWeight: '400' },
  goalEditorInput: { minHeight: 40, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, color: C.inkDark, fontSize: 16, fontWeight: '600', paddingVertical: 6 },
  goalDetailInput: { minHeight: 38, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, color: C.inkDark, fontSize: 14, paddingVertical: 6 },
  categoryPicker: { flexDirection: 'row', gap: 7, marginTop: 10 },
  categoryChoice: { minHeight: 29, borderRadius: 15, backgroundColor: C.cream, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  categoryChoiceActive: { backgroundColor: C.ink },
  categoryChoiceText: { color: C.muted, fontSize: 12, fontWeight: '500' },
  categoryChoiceTextActive: { color: C.white },
  goalReminderRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  goalReminderLabel: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  goalReminderText: { color: C.inkDark, fontSize: 14, fontWeight: '600' },
  goalReminderHint: { color: C.muted, fontSize: 10, marginTop: 2 },
  goalReminderControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addGoalButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, marginBottom: 28 },
  addGoalText: { color: C.coral, fontSize: 15, fontWeight: '600' },
  targetList: { backgroundColor: C.paper, borderRadius: 12, paddingLeft: 16, overflow: 'hidden' },
  targetRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, paddingRight: 12 },
  stepper: { height: 34, flexDirection: 'row', alignItems: 'center', borderRadius: 8, backgroundColor: C.cream, overflow: 'hidden' },
  stepperButton: { width: 36, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { minWidth: 26, color: C.inkDark, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  goalSettingsNote: { color: C.muted, fontSize: 12, lineHeight: 17, marginHorizontal: 16, marginTop: 10 },
  communityTabs: { flexDirection: 'row', backgroundColor: '#E5E5EA', borderRadius: 9, padding: 2, marginBottom: 22 },
  communityTab: { flex: 1, minHeight: 32, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  communityTabActive: { backgroundColor: C.paper },
  communityTabText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  communityTabTextActive: { color: C.coral },
  todayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  todayDate: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  todayTitle: { color: C.inkDark, fontSize: 34, fontWeight: '800', letterSpacing: -1.1 },
  todayGreeting: { color: C.inkDark, fontSize: 19, fontWeight: '700', marginBottom: 22 },
  todayProgress: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  todayProgressCopy: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  todayProgressCount: { color: C.inkDark, fontSize: 14, fontWeight: '900' },
  todayProgressLabel: { color: C.muted, fontSize: 11 },
  todayProgressPercent: { color: C.ink, fontSize: 12, fontWeight: '900' },
  todayProgressTrack: { height: 7, borderRadius: 4, backgroundColor: '#E3E4DE', marginTop: 10, marginBottom: 34, overflow: 'hidden' },
  todayProgressFill: { height: '100%', borderRadius: 4, backgroundColor: C.coral },
  calmSectionTitle: { color: C.inkDark, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginBottom: 14 },
  calmGoalList: { gap: 12, marginBottom: 32 },
  calmGoalCard: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 16 },
  calmGoalDone: { backgroundColor: '#F0F1EC' },
  calmGoalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  completedBadge: { color: C.ink, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  calmGoalTitle: { color: C.inkDark, fontSize: 17, fontWeight: '800', marginBottom: 16 },
  calmGoalTitleDone: { color: C.muted },
  didItButton: { minHeight: 50, borderRadius: 10, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  didItButtonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  didItCamera: { color: C.white, fontSize: 22, fontWeight: '600' },
  didItText: { color: C.white, fontSize: 13, fontWeight: '900' },
  completedRow: { minHeight: 46, borderRadius: 10, backgroundColor: '#E1E8DF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  completedDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  completedCheck: { color: C.white, fontSize: 12, fontWeight: '900' },
  completedText: { color: C.ink, fontSize: 12, fontWeight: '800' },
  weekPlan: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 16 },
  weekPlanRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderBottomColor: C.line },
  weekPlanRowLast: { borderBottomWidth: 0 },
  weekPlanCopy: { flex: 1 },
  weekPlanTitle: { color: C.inkDark, fontSize: 13, fontWeight: '800', marginBottom: 10 },
  weekPlanTrack: { height: 5, borderRadius: 3, backgroundColor: '#E3E4DE', overflow: 'hidden' },
  weekPlanFill: { height: '100%', borderRadius: 3, backgroundColor: C.coral },
  weekPlanCount: { color: C.ink, fontSize: 12, fontWeight: '900' },
  scoreCard: { backgroundColor: C.ink, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 34 },
  scoreCircle: { width: 82, height: 82, borderRadius: 41, borderWidth: 7, borderColor: C.coral, alignItems: 'center', justifyContent: 'center' },
  scoreValue: { color: C.white, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 22 },
  scoreLabel: { color: C.sage, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  scoreCopy: { flex: 1 },
  scoreTitle: { color: C.white, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 20, lineHeight: 24, marginBottom: 7 },
  mutedText: { color: C.sage, fontSize: 11, lineHeight: 17 },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6, marginBottom: 16 },
  sectionTitle: { color: C.inkDark, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 29, letterSpacing: -1 },
  sectionMeta: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  goalCard: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, paddingHorizontal: 17 },
  goalRow: { minHeight: 96, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.line },
  noBorder: { borderBottomWidth: 0 },
  goalIndex: { width: 36, color: C.sage, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 20 },
  goalCopy: { flex: 1, paddingVertical: 14 },
  goalCategory: { color: C.coral, fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginBottom: 5 },
  goalTitle: { color: C.inkDark, fontSize: 14, fontWeight: '800', marginBottom: 5 },
  goalDetail: { color: C.muted, fontSize: 10 },
  strike: { textDecorationLine: 'line-through', opacity: 0.5 },
  doneBox: { width: 28, height: 28, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  doneCheck: { color: C.white, fontSize: 14, fontWeight: '900' },
  proofButton: { width: 62, alignItems: 'center', gap: 3 },
  proofIcon: { color: C.ink, fontSize: 21, fontWeight: '700' },
  proofText: { color: C.ink, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  weekCards: { gap: 12, paddingRight: 20 },
  weekCard: { width: 275, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, padding: 20 },
  weekTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  weekIcon: { width: 32, height: 32, lineHeight: 32, textAlign: 'center', backgroundColor: C.ink, color: C.white, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }) },
  onTrack: { color: C.ink, backgroundColor: '#DDE8D8', paddingHorizontal: 9, paddingVertical: 6, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  attention: { color: '#A33D27', backgroundColor: C.blush, paddingHorizontal: 9, paddingVertical: 6, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  weekTitle: { color: C.inkDark, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 23, marginBottom: 16 },
  weekNumber: { color: C.inkDark, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 38 },
  weekOutOf: { color: C.muted, fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }), fontSize: 10 },
  progress: { height: 5, backgroundColor: '#DFDED5', marginTop: 13 },
  progressFill: { height: 5, backgroundColor: C.ink },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.line, paddingHorizontal: 10, paddingVertical: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.coral },
  liveText: { color: C.ink, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  feedFilter: { flexDirection: 'row', padding: 4, backgroundColor: '#E8E5DC', marginBottom: 18 },
  filterActive: { flex: 1, alignItems: 'center', backgroundColor: C.paper, padding: 11 },
  filterInactive: { flex: 1, alignItems: 'center', padding: 11 },
  filterActiveText: { color: C.ink, fontSize: 11, fontWeight: '900' },
  filterText: { color: C.muted, fontSize: 11, fontWeight: '800' },
  postCard: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, marginBottom: 18 },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  postPerson: { flex: 1, marginLeft: 10 },
  postNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  postName: { color: C.inkDark, fontSize: 13, fontWeight: '900' },
  youTag: { color: C.coral, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  postTime: { color: C.muted, fontSize: 9, marginTop: 3 },
  more: { color: C.muted, fontSize: 11, letterSpacing: 2 },
  postImage: { width: '100%', height: 285, backgroundColor: C.sage },
  postPhoto: { height: 275, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoEmoji: { fontSize: 92 },
  photoStamp: { position: 'absolute', right: 14, bottom: 14, backgroundColor: C.ink, paddingHorizontal: 10, paddingVertical: 7 },
  photoStampText: { color: C.white, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  postBody: { padding: 16 },
  postCategory: { color: C.coral, fontSize: 8, fontWeight: '900', letterSpacing: 1.3, marginBottom: 7 },
  postActivity: { color: C.inkDark, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  postDuration: { color: C.ink, fontSize: 10, fontWeight: '800', marginBottom: 13 },
  postCaption: { color: C.muted, fontSize: 12, lineHeight: 19, marginBottom: 16 },
  reactionRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 13 },
  reaction: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: C.line },
  reactionOn: { backgroundColor: C.blush, borderColor: C.coral },
  reactionIcon: { color: C.coral, fontSize: 15 },
  reactionText: { color: C.ink, fontSize: 10, fontWeight: '800' },
  completionGoalCard: { backgroundColor: C.ink, paddingHorizontal: 18, paddingVertical: 15, marginBottom: 12 },
  completionGoalCategory: { color: C.coral, fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginBottom: 5 },
  completionGoalTitle: { color: C.white, fontSize: 20, fontWeight: '700' },
  photoPicker: { minHeight: 260, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, marginBottom: 20, overflow: 'hidden' },
  emptyPhoto: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: 25 },
  cameraCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#E7E9DD', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  cameraIcon: { color: C.ink, fontSize: 30 },
  photoTitle: { color: C.inkDark, fontSize: 20, fontWeight: '700', marginBottom: 7 },
  photoHint: { color: C.muted, textAlign: 'center', fontSize: 11, lineHeight: 17, maxWidth: 260 },
  photoActions: { marginTop: 20 },
  cameraButton: { backgroundColor: C.ink, paddingHorizontal: 28, paddingVertical: 13 },
  cameraButtonText: { color: C.white, fontSize: 10, fontWeight: '900' },
  selectedPhoto: { width: '100%', height: 275 },
  replacePhoto: { position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(16,44,37,.88)', paddingHorizontal: 12, paddingVertical: 9 },
  replaceText: { color: C.white, fontSize: 9, fontWeight: '900' },
  moodGrid: { flexDirection: 'row', gap: 6 },
  moodOption: { flex: 1, minHeight: 76, alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper },
  moodOptionActive: { borderColor: C.coral, backgroundColor: C.blush },
  moodFace: { fontSize: 27 },
  moodLabel: { color: C.muted, fontSize: 8, fontWeight: '800' },
  moodLabelActive: { color: C.coral },
  shareChoiceCard: { backgroundColor: C.paper, borderRadius: 12, flexDirection: 'row', alignItems: 'center', padding: 16, marginTop: 22 },
  shareChoiceCopy: { flex: 1, paddingRight: 14 },
  shareChoiceTitle: { color: C.inkDark, fontSize: 14, fontWeight: '700' },
  shareChoiceText: { color: C.muted, fontSize: 10, lineHeight: 14, marginTop: 4 },
  shareButton: { height: 56, marginTop: 22, backgroundColor: C.coral, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareButtonText: { color: C.white, fontSize: 13, fontWeight: '900' },
  shareNote: { color: C.muted, textAlign: 'center', fontSize: 9, lineHeight: 15, marginTop: 10 },
  search: { height: 52, flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, paddingHorizontal: 15, marginBottom: 28 },
  searchIcon: { color: C.ink, fontSize: 23, marginRight: 9 },
  searchInput: { flex: 1, height: '100%', color: C.inkDark, fontSize: 13 },
  friendFaces: { flexDirection: 'row', gap: 15, marginBottom: 32 },
  friendFace: { alignItems: 'center', gap: 7 },
  largeAvatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  largeAvatarText: { color: C.white, fontSize: 13, fontWeight: '900' },
  inviteCircle: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, borderStyle: 'dashed', borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  invitePlus: { color: C.ink, fontSize: 26 },
  faceName: { color: C.ink, fontSize: 9, fontWeight: '700' },
  peopleCard: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, paddingHorizontal: 15 },
  personRow: { minHeight: 75, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.line },
  personCopy: { flex: 1, marginLeft: 11 },
  personName: { color: C.inkDark, fontSize: 12, fontWeight: '900' },
  personMeta: { color: C.muted, fontSize: 9, marginTop: 4 },
  addFriend: { minWidth: 59, alignItems: 'center', backgroundColor: C.ink, paddingHorizontal: 12, paddingVertical: 9 },
  addedFriend: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line },
  addFriendText: { color: C.white, fontSize: 9, fontWeight: '900' },
  addedFriendText: { color: C.ink },
  privacyCard: { flexDirection: 'row', gap: 13, padding: 17, backgroundColor: '#E5E8DC', marginTop: 20 },
  privacyIcon: { color: C.ink, fontSize: 20 },
  privacyCopy: { flex: 1 },
  privacyTitle: { color: C.ink, fontSize: 11, fontWeight: '900', marginBottom: 5 },
  privacyText: { color: C.muted, fontSize: 9, lineHeight: 14 },
  profileTop: { alignItems: 'center', paddingTop: 15, paddingBottom: 26 },
  profileAvatar: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink, marginBottom: 15 },
  profileInitials: { color: C.white, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 25 },
  profileName: { color: C.inkDark, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  profileUsername: { color: C.coral, fontSize: 11, fontWeight: '800', marginTop: 4 },
  profileBio: { color: C.muted, fontSize: 12, marginTop: 10 },
  statsCard: { flexDirection: 'row', backgroundColor: C.ink, paddingVertical: 21, marginBottom: 32 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: C.white, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 28 },
  statLabel: { color: C.sage, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 3 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,.18)' },
  miniPost: { flexDirection: 'row', backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, marginBottom: 10, padding: 10 },
  miniImage: { width: 68, height: 68, marginRight: 13 },
  miniCopy: { flex: 1, justifyContent: 'center' },
  miniTitle: { color: C.inkDark, fontSize: 18, fontWeight: '700' },
  emptyProof: { alignItems: 'center', padding: 35, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed', marginBottom: 25 },
  emptyProofIcon: { color: C.sage, fontSize: 42, marginBottom: 10 },
  emptyProofTitle: { color: C.inkDark, fontSize: 19, fontWeight: '700', marginBottom: 6 },
  emptyProofText: { color: C.muted, fontSize: 10 },
  settingsCard: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, paddingHorizontal: 15, marginTop: 18 },
  settingsRow: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.line },
  settingsText: { color: C.ink, fontSize: 11, fontWeight: '800' },
  settingsArrow: { color: C.muted, fontSize: 22 },
  reminderLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cream },
  reminderBack: { alignSelf: 'flex-start', marginBottom: 28 },
  reminderIntro: { color: C.muted, fontSize: 13, lineHeight: 20, marginTop: -12, marginBottom: 25 },
  reminderCard: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, paddingHorizontal: 16 },
  reminderRow: { minHeight: 144, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 20 },
  reminderIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E4E7DA' },
  reminderIconText: { color: C.ink, fontSize: 19 },
  reminderCopy: { flex: 1 },
  reminderTitle: { color: C.inkDark, fontSize: 18, fontWeight: '700', marginBottom: 5 },
  reminderDescription: { color: C.muted, fontSize: 9, lineHeight: 14, marginBottom: 9 },
  reminderTime: { color: C.coral, fontSize: 10, fontWeight: '900' },
  toggle: { width: 45, height: 26, borderRadius: 13, backgroundColor: '#CECEC4', padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: C.ink },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.white },
  toggleKnobOn: { alignSelf: 'flex-end' },
  timePickerCard: { marginTop: 14, padding: 18, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line },
  timeDone: { alignSelf: 'flex-end', backgroundColor: C.ink, paddingHorizontal: 18, paddingVertical: 10 },
  timeDoneText: { color: C.white, fontSize: 10, fontWeight: '900' },
  reminderNote: { flexDirection: 'row', gap: 11, backgroundColor: '#E5E8DC', padding: 16, marginTop: 18 },
  reminderNoteIcon: { width: 20, height: 20, borderRadius: 10, textAlign: 'center', lineHeight: 20, backgroundColor: C.ink, color: C.white, fontSize: 10, fontWeight: '900' },
  reminderNoteText: { flex: 1, color: C.muted, fontSize: 9, lineHeight: 14 },
  bottomNav: { minHeight: 72, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 11 : 5, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, backgroundColor: C.paper, flexDirection: 'row', alignItems: 'center' },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  navIcon: { color: C.muted, fontSize: 19, fontWeight: '700' },
  navLabel: { color: C.muted, fontSize: 10, fontWeight: '500' },
  navActive: { color: C.coral, fontWeight: '600' },
  logNav: { width: 42, height: 42, marginTop: -22, borderRadius: 21, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: C.paper },
  logNavActive: { backgroundColor: C.coral },
  logNavIcon: { color: C.white, fontSize: 25, lineHeight: 27 },
});
