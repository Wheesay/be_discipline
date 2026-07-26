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
  cream: '#F2F2F7',
  paper: '#FFFFFF',
  coral: '#3478F6',
  sage: '#AEAEB2',
  muted: '#6E6E73',
  line: '#D1D1D6',
  white: '#FFFFFF',
  blush: '#EAF2FF',
};

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
  reminder?: GoalReminder;
};

type GoalReminder = {
  enabled: boolean;
  hour: number;
  minute: number;
  notificationId?: string;
};

type WeeklyGoals = {
  exerciseTarget: number;
  mealTarget: number;
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
};

const starterGoals: Goal[] = [
  { id: 'g1', title: 'Strength training', detail: '45 min · Upper body', category: 'MOVE', done: false },
  { id: 'g2', title: 'Cook a balanced dinner', detail: 'Protein + greens', category: 'FUEL', done: false },
  { id: 'g3', title: 'Evening walk', detail: '30 min · Phone stays home', category: 'FOCUS', done: false },
];

const starterWeeklyGoals: WeeklyGoals = {
  exerciseTarget: 4,
  mealTarget: 5,
};

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
  const [weeklyGoals, setWeeklyGoals] = useState(starterWeeklyGoals);
  const [friends, setFriends] = useState(people);
  const [posts, setPosts] = useState(starterPosts);
  const [reacted, setReacted] = useState<Record<string, Reaction[]>>({});
  const [logGoal, setLogGoal] = useState<Goal | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!value) return;
        const state = JSON.parse(value);
        setUser(state.user ?? null);
        setGoals(state.goals ?? starterGoals);
        setWeeklyGoals(state.weeklyGoals ?? starterWeeklyGoals);
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
    setLogGoal(goal ?? null);
    setTab('log');
  }

  function publishPost(post: Post) {
    setPosts((current) => [post, ...current]);
    if (logGoal) {
      setGoals((current) =>
        current.map((goal) => (goal.id === logGoal.id ? { ...goal, done: true } : goal)),
      );
    }
    setLogGoal(null);
    setTab('feed');
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
            onCancel={() => setTab('today')}
            onSave={(nextGoals, nextWeeklyGoals) => {
              setGoals(nextGoals);
              setWeeklyGoals(nextWeeklyGoals);
              setTab('today');
            }}
          />
        )}
      </View>
      <BottomNav tab={tab} onChange={(next) => { setLogGoal(null); setTab(next); }} />
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
}: {
  user: User;
  goals: Goal[];
  weeklyGoals: WeeklyGoals;
  onLog: (goal: Goal) => void;
}) {
  const completed = goals.filter((goal) => goal.done).length;
  const progress = `${(completed / goals.length) * 100}%` as `${number}%`;
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

      <View style={styles.nativeSectionHeader}>
        <Text style={styles.nativeSectionTitle}>Daily goals</Text>
        <Text style={styles.nativeSectionMeta}>{completed} of {goals.length}</Text>
      </View>
      <View style={styles.nativeProgressTrack}>
        <View style={[styles.nativeProgressFill, { width: progress }]} />
      </View>

      <View style={styles.nativeList}>
        {goals.map((goal, index) => (
          <View
            key={goal.id}
            style={[styles.nativeGoalRow, index === goals.length - 1 && styles.nativeLastRow]}>
            <View style={[styles.nativeStatusCircle, goal.done && styles.nativeStatusCircleDone]}>
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
              {!!goal.detail && <Text style={styles.nativeGoalDetail}>{goal.detail}</Text>}
              <Text style={styles.nativeGoalCategory}>
                {goal.category.toLowerCase()}
                {goal.reminder?.enabled
                  ? ` · ${formatTime(goal.reminder.hour, goal.reminder.minute)}`
                  : ''}
              </Text>
            </View>
            {!goal.done && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`I did ${goal.title}. Take a selfie`}
                style={({ pressed }) => [styles.nativeDoneButton, pressed && styles.nativePressed]}
                onPress={() => onLog(goal)}>
                <SymbolView
                  name={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }}
                  size={15}
                  tintColor={C.coral}
                />
                <Text style={styles.nativeDoneText}>Done</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      <View style={styles.nativeSectionHeader}>
        <Text style={styles.nativeSectionTitle}>This week</Text>
      </View>
      <View style={styles.nativeList}>
        <View style={styles.nativeWeekRow}>
          <View style={styles.nativeWeekIcon}>
            <SymbolView name={{ ios: 'figure.run', android: 'directions_run', web: 'directions_run' }} size={18} tintColor={C.ink} />
          </View>
          <View style={styles.nativeGoalCopy}>
            <Text style={styles.nativeGoalTitle}>Exercise</Text>
            <Text style={styles.nativeGoalCategory}>3 of {weeklyGoals.exerciseTarget} times</Text>
          </View>
          <Text style={styles.nativeWeekCount}>
            {Math.min(100, Math.round((3 / weeklyGoals.exerciseTarget) * 100))}%
          </Text>
        </View>
        <View style={[styles.nativeWeekRow, styles.nativeLastRow]}>
          <View style={styles.nativeWeekIcon}>
            <SymbolView name={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }} size={18} tintColor={C.ink} />
          </View>
          <View style={styles.nativeGoalCopy}>
            <Text style={styles.nativeGoalTitle}>Balanced meals</Text>
            <Text style={styles.nativeGoalCategory}>2 of {weeklyGoals.mealTarget} meals</Text>
          </View>
          <Text style={styles.nativeWeekCount}>
            {Math.min(100, Math.round((2 / weeklyGoals.mealTarget) * 100))}%
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function GoalSettingsScreen({
  goals,
  weeklyGoals,
  onCancel,
  onSave,
}: {
  goals: Goal[];
  weeklyGoals: WeeklyGoals;
  onCancel: () => void;
  onSave: (goals: Goal[], weeklyGoals: WeeklyGoals) => void;
}) {
  const [draftGoals, setDraftGoals] = useState(goals);
  const [draftWeekly, setDraftWeekly] = useState(weeklyGoals);
  const categories: Goal['category'][] = ['MOVE', 'FUEL', 'FOCUS'];
  const validGoals = draftGoals.filter((goal) => goal.title.trim());

  function updateGoal(id: string, update: Partial<Goal>) {
    setDraftGoals((current) =>
      current.map((goal) => (goal.id === id ? { ...goal, ...update } : goal)),
    );
  }

  function addGoal() {
    setDraftGoals((current) => [
      ...current,
      {
        id: `goal-${Date.now()}`,
        title: '',
        detail: '',
        category: 'FOCUS',
        done: false,
      },
    ]);
  }

  function changeTarget(key: keyof WeeklyGoals, amount: number) {
    setDraftWeekly((current) => ({
      ...current,
      [key]: Math.max(1, Math.min(key === 'mealTarget' ? 14 : 7, current[key] + amount)),
    }));
  }

  async function saveSettings() {
    const originalById = new Map(goals.map((goal) => [goal.id, goal]));
    const nextGoals = validGoals.map((goal) => ({
      ...goal,
      title: goal.title.trim(),
      detail: goal.detail.trim(),
    }));
    const nextIds = new Set(nextGoals.map((goal) => goal.id));

    for (const original of goals) {
      if (!nextIds.has(original.id) && original.reminder?.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(original.reminder.notificationId);
      }
    }

    let permission: boolean | undefined;
    let permissionWarningShown = false;
    const scheduledGoals: Goal[] = [];

    for (const goal of nextGoals) {
      const original = originalById.get(goal.id);
      const previousReminder = original?.reminder;
      const reminder = goal.reminder;
      const unchanged =
        reminder?.enabled &&
        previousReminder?.enabled &&
        previousReminder.notificationId &&
        reminder.hour === previousReminder.hour &&
        reminder.minute === previousReminder.minute;

      if (previousReminder?.notificationId && !unchanged) {
        await Notifications.cancelScheduledNotificationAsync(previousReminder.notificationId);
      }

      if (!reminder?.enabled) {
        scheduledGoals.push({ ...goal, reminder: reminder ? { ...reminder, notificationId: undefined } : undefined });
        continue;
      }

      if (unchanged) {
        scheduledGoals.push({
          ...goal,
          reminder: { ...reminder, notificationId: previousReminder.notificationId },
        });
        continue;
      }

      if (permission === undefined) permission = await ensureNotificationPermission();
      if (!permission) {
        scheduledGoals.push({ ...goal, reminder: { ...reminder, enabled: false, notificationId: undefined } });
        if (!permissionWarningShown) {
          Alert.alert(
            'Notifications are off',
            'The goals were saved, but reminders remain off until notifications are allowed in phone settings.',
          );
          permissionWarningShown = true;
        }
        continue;
      }

      const notificationId = await scheduleGoalReminder(goal);
      scheduledGoals.push({ ...goal, reminder: { ...reminder, notificationId } });
    }

    onSave(scheduledGoals, draftWeekly);
  }

  return (
    <KeyboardAvoidingView
      style={styles.goalSettingsScreen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.settingsNav}>
        <Pressable accessibilityRole="button" onPress={onCancel}>
          <Text style={styles.settingsNavAction}>Cancel</Text>
        </Pressable>
        <Text style={styles.settingsNavTitle}>Goals</Text>
        <Pressable
          accessibilityRole="button"
          disabled={!validGoals.length}
          onPress={saveSettings}>
          <Text style={[styles.settingsNavAction, styles.settingsSave, !validGoals.length && styles.disabled]}>
            Save
          </Text>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.goalSettingsContent}>
        <Text style={styles.settingsSectionLabel}>DAILY GOALS</Text>
        <View style={styles.goalEditorList}>
          {draftGoals.map((goal, index) => (
            <View
              key={goal.id}
              style={[styles.goalEditorRow, index === draftGoals.length - 1 && styles.nativeLastRow]}>
              <View style={styles.goalEditorTop}>
                <Text style={styles.goalFieldLabel}>Activity</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${goal.title || 'goal'}`}
                  hitSlop={10}
                  onPress={() =>
                    setDraftGoals((current) => current.filter((item) => item.id !== goal.id))
                  }>
                  <SymbolView
                    name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                    size={18}
                    tintColor={C.muted}
                  />
                </Pressable>
              </View>
              <TextInput
                value={goal.title}
                onChangeText={(title) => updateGoal(goal.id, { title })}
                placeholder="30 minute walk"
                placeholderTextColor={C.sage}
                style={styles.goalEditorInput}
                returnKeyType="next"
              />
              <Text style={styles.goalFieldLabel}>Additional goal <Text style={styles.goalFieldOptional}>Optional</Text></Text>
              <TextInput
                value={goal.detail}
                onChangeText={(detail) => updateGoal(goal.id, { detail })}
                placeholder="3 min fast walk, 5 min rest"
                placeholderTextColor={C.sage}
                style={styles.goalDetailInput}
                returnKeyType="done"
              />
              <Text style={styles.goalFieldLabel}>Type</Text>
              <View style={styles.categoryPicker}>
                {categories.map((category) => (
                  <Pressable
                    key={category}
                    style={[styles.categoryChoice, goal.category === category && styles.categoryChoiceActive]}
                    onPress={() => updateGoal(goal.id, { category })}>
                    <Text
                      style={[
                        styles.categoryChoiceText,
                        goal.category === category && styles.categoryChoiceTextActive,
                      ]}>
                      {category[0] + category.slice(1).toLowerCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.goalReminderRow}>
                <View style={styles.goalReminderLabel}>
                  <SymbolView
                    name={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
                    size={17}
                    tintColor={C.muted}
                  />
                  <View>
                    <Text style={styles.goalReminderText}>Alarm</Text>
                    <Text style={styles.goalReminderHint}>Optional · set a time to do it</Text>
                  </View>
                </View>
                <View style={styles.goalReminderControls}>
                  {goal.reminder?.enabled && (
                    <DateTimePicker
                      value={timeAsDate(goal.reminder)}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'compact' : 'default'}
                      onValueChange={(_event, date) => {
                        updateGoal(goal.id, {
                          reminder: {
                            ...goal.reminder!,
                            hour: date.getHours(),
                            minute: date.getMinutes(),
                            notificationId: undefined,
                          },
                        });
                      }}
                      accentColor={C.coral}
                    />
                  )}
                  <Switch
                    value={goal.reminder?.enabled ?? false}
                    onValueChange={(enabled) =>
                      updateGoal(goal.id, {
                        reminder: {
                          enabled,
                          hour: goal.reminder?.hour ?? 9,
                          minute: goal.reminder?.minute ?? 0,
                          notificationId: goal.reminder?.notificationId,
                        },
                      })
                    }
                    trackColor={{ false: '#D1D1D6', true: '#8EB5FA' }}
                    thumbColor={C.white}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={draftGoals.length >= 5}
          style={[styles.addGoalButton, draftGoals.length >= 5 && styles.disabled]}
          onPress={addGoal}>
          <SymbolView
            name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
            size={20}
            tintColor={C.coral}
          />
          <Text style={styles.addGoalText}>Add daily goal</Text>
        </Pressable>

        <Text style={styles.settingsSectionLabel}>WEEKLY TARGETS</Text>
        <View style={styles.targetList}>
          <TargetStepper
            title="Exercise"
            suffix="times"
            value={draftWeekly.exerciseTarget}
            onDecrease={() => changeTarget('exerciseTarget', -1)}
            onIncrease={() => changeTarget('exerciseTarget', 1)}
          />
          <TargetStepper
            title="Balanced meals"
            suffix="meals"
            value={draftWeekly.mealTarget}
            onDecrease={() => changeTarget('mealTarget', -1)}
            onIncrease={() => changeTarget('mealTarget', 1)}
            last
          />
        </View>
        <Text style={styles.goalSettingsNote}>
          Keep it simple. Daily goals reset each day; weekly targets reset every Monday.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TargetStepper({
  title,
  suffix,
  value,
  onDecrease,
  onIncrease,
  last = false,
}: {
  title: string;
  suffix: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.targetRow, last && styles.nativeLastRow]}>
      <View style={styles.nativeGoalCopy}>
        <Text style={styles.nativeGoalTitle}>{title}</Text>
        <Text style={styles.nativeGoalCategory}>{value} {suffix} per week</Text>
      </View>
      <View style={styles.stepper}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${title}`} style={styles.stepperButton} onPress={onDecrease}>
          <SymbolView name={{ ios: 'minus', android: 'remove', web: 'remove' }} size={14} tintColor={C.coral} />
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${title}`} style={styles.stepperButton} onPress={onIncrease}>
          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={14} tintColor={C.coral} />
        </Pressable>
      </View>
    </View>
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
      {posts.map((post) => (
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

  const ready = Boolean(photo && mood);
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
      time: 'Just now',
      duration: 'Completed today',
      reactions: { heart: 0, kudos: 0 },
      mine: true,
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
            <Text style={styles.photoTitle}>Take your completion selfie</Text>
            <Text style={styles.photoHint}>One tap. Your face is the proof.</Text>
            <View style={styles.photoActions}>
              <Pressable style={styles.cameraButton} onPress={takeSelfie}>
                <Text style={styles.cameraButtonText}>Take selfie</Text>
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
      <Pressable disabled={!ready} style={[styles.shareButton, !ready && styles.disabled]} onPress={share}>
        <Text style={styles.shareButtonText}>Complete & share</Text>
        <Text style={styles.shareButtonText}>→</Text>
      </Pressable>
      <Text style={styles.shareNote}>Shared with friends only. They can respond with hearts and kudos.</Text>
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

async function scheduleGoalReminder(goal: Goal) {
  const reminder = goal.reminder;
  if (!reminder) throw new Error('Cannot schedule a goal without a reminder time.');
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `Time for ${goal.title}`,
      body: goal.detail || 'You planned this. Start small and show up.',
      sound: true,
      data: { screen: 'today', goalId: goal.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: reminder.hour,
      minute: reminder.minute,
      channelId: 'discipline-reminders',
    },
  });
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
            <SymbolView name={item.symbol} size={22} tintColor={active ? C.ink : C.muted} />
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
  nativeAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' },
  nativeAvatarText: { color: C.ink, fontSize: 12, fontWeight: '700' },
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
  nativePressed: { opacity: 0.55 },
  nativeWeekRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, paddingRight: 16 },
  nativeWeekIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  nativeWeekCount: { color: C.muted, fontSize: 13, fontWeight: '600' },
  goalSettingsScreen: { flex: 1, backgroundColor: C.cream },
  settingsNav: { height: 52, backgroundColor: C.paper, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingsNavTitle: { color: C.inkDark, fontSize: 17, fontWeight: '700' },
  settingsNavAction: { color: C.coral, fontSize: 16 },
  settingsSave: { fontWeight: '700' },
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
  communityTabTextActive: { color: C.inkDark },
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
  navActive: { color: C.ink, fontWeight: '600' },
  logNav: { width: 42, height: 42, marginTop: -22, borderRadius: 21, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: C.paper },
  logNavActive: { backgroundColor: C.coral },
  logNavIcon: { color: C.white, fontSize: 25, lineHeight: 27 },
});
