import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
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
  ink: '#173F35',
  inkDark: '#102C25',
  cream: '#F4F0E6',
  paper: '#FCF9F1',
  coral: '#EF6A47',
  sage: '#A8B8A5',
  muted: '#707971',
  line: '#D9D8CC',
  white: '#FFFFFF',
  blush: '#F7DED5',
};

type Tab = 'today' | 'feed' | 'log' | 'friends' | 'profile' | 'reminders';
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
      JSON.stringify({ user, goals, friends, posts, reacted }),
    );
  }, [loading, user, goals, friends, posts, reacted]);

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
        {tab === 'today' && <TodayScreen user={user} goals={goals} onLog={openLog} />}
        {tab === 'feed' && <FeedScreen posts={posts} reacted={reacted} onReact={react} />}
        {tab === 'log' && (
          <LogScreen user={user} selectedGoal={logGoal} goals={goals} onPublish={publishPost} />
        )}
        {tab === 'friends' && <FriendsScreen friends={friends} setFriends={setFriends} />}
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
  onLog,
}: {
  user: User;
  goals: Goal[];
  onLog: (goal: Goal) => void;
}) {
  const completed = goals.filter((goal) => goal.done).length;
  const progress = `${(completed / goals.length) * 100}%` as `${number}%`;
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.todayHeader}>
        <View>
          <Text style={styles.todayDate}>THURSDAY · WEEK 31</Text>
          <Text style={styles.todayTitle}>Today</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials(user.name)}</Text></View>
      </View>
      <Text style={styles.todayGreeting}>Ready to show up, {user.name.split(' ')[0]}?</Text>
      <View style={styles.todayProgress}>
        <View style={styles.todayProgressCopy}>
          <Text style={styles.todayProgressCount}>{completed} of {goals.length}</Text>
          <Text style={styles.todayProgressLabel}>promises completed</Text>
        </View>
        <Text style={styles.todayProgressPercent}>{Math.round((completed / goals.length) * 100)}%</Text>
      </View>
      <View style={styles.todayProgressTrack}>
        <View style={[styles.todayProgressFill, { width: progress }]} />
      </View>

      <Text style={styles.calmSectionTitle}>Your promises</Text>
      <View style={styles.calmGoalList}>
        {goals.map((goal) => (
          <View key={goal.id} style={[styles.calmGoalCard, goal.done && styles.calmGoalDone]}>
            <View style={styles.calmGoalTop}>
              <Text style={styles.goalCategory}>{goal.category}</Text>
              {goal.done && <Text style={styles.completedBadge}>COMPLETED</Text>}
            </View>
            <Text style={[styles.calmGoalTitle, goal.done && styles.calmGoalTitleDone]}>{goal.title}</Text>
            {goal.done ? (
              <View style={styles.completedRow}>
                <View style={styles.completedDot}><Text style={styles.completedCheck}>✓</Text></View>
                <Text style={styles.completedText}>Promise kept</Text>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`I did ${goal.title}. Take a selfie`}
                style={({ pressed }) => [styles.didItButton, pressed && styles.didItButtonPressed]}
                onPress={() => onLog(goal)}>
                <Text style={styles.didItCamera}>📷</Text>
                <Text style={styles.didItText}>I did it — take selfie</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      <Text style={styles.calmSectionTitle}>This week</Text>
      <View style={styles.weekPlan}>
        <View style={styles.weekPlanRow}>
          <View style={styles.weekPlanCopy}>
            <Text style={styles.weekPlanTitle}>Exercise 4 times</Text>
            <View style={styles.weekPlanTrack}><View style={[styles.weekPlanFill, { width: '75%' }]} /></View>
          </View>
          <Text style={styles.weekPlanCount}>3 / 4</Text>
        </View>
        <View style={[styles.weekPlanRow, styles.weekPlanRowLast]}>
          <View style={styles.weekPlanCopy}>
            <Text style={styles.weekPlanTitle}>Cook 5 balanced meals</Text>
            <View style={styles.weekPlanTrack}><View style={[styles.weekPlanFill, { width: '40%' }]} /></View>
          </View>
          <Text style={styles.weekPlanCount}>2 / 5</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function FeedScreen({
  posts,
  reacted,
  onReact,
}: {
  posts: Post[];
  reacted: Record<string, Reaction[]>;
  onReact: (postId: string, reaction: Reaction) => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
            <View style={styles.cameraCircle}><Text style={styles.cameraIcon}>📷</Text></View>
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
}: {
  friends: Friend[];
  setFriends: React.Dispatch<React.SetStateAction<Friend[]>>;
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
          <Text style={styles.emptyProofIcon}>📷</Text>
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

function RemindersScreen({ onBack }: { onBack: () => void }) {
  const [reminders, setReminders] = useState(defaultReminders);
  const [editing, setEditing] = useState<ReminderName | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(reminderStorageKey)
      .then((value) => value && setReminders(JSON.parse(value)))
      .finally(() => setReady(true));
  }, []);

  async function ensurePermission() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('discipline-reminders', {
        name: 'Daily discipline reminders',
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

    const granted = await ensurePermission();
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

  async function changeTime(name: ReminderName, event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setEditing(null);
    if (event.type === 'dismissed' || !date) return;
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
            onChange={(event, date) => changeTime(editing, event, date)}
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

function timeAsDate(reminder: ReminderState) {
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
  const items: { id: Tab; icon: string; label: string }[] = [
    { id: 'today', icon: '●', label: 'Today' },
    { id: 'feed', icon: '◫', label: 'Feed' },
    { id: 'log', icon: '📷', label: 'Proof' },
    { id: 'friends', icon: '♧', label: 'Friends' },
    { id: 'profile', icon: '○', label: 'Me' },
  ];
  return (
    <View style={styles.bottomNav}>
      {items.map((item) => {
        const active = tab === item.id || (item.id === 'profile' && tab === 'reminders');
        const central = item.id === 'log';
        return (
          <Pressable key={item.id} style={styles.navItem} onPress={() => onChange(item.id)}>
            <View style={[central && styles.logNav, central && active && styles.logNavActive]}>
              <Text style={[styles.navIcon, active && styles.navActive, central && styles.logNavIcon]}>{item.icon}</Text>
            </View>
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
  onboardTitle: { color: C.inkDark, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 46, lineHeight: 47, letterSpacing: -2, marginBottom: 16 },
  onboardText: { color: C.muted, fontSize: 14, lineHeight: 21, marginBottom: 20 },
  primaryButton: { height: 56, paddingHorizontal: 20, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryButtonText: { color: C.white, fontSize: 13, fontWeight: '900', letterSpacing: 0.4 },
  demoButton: { alignItems: 'center', padding: 18 },
  demoButtonText: { color: C.ink, fontSize: 13, fontWeight: '800', textDecorationLine: 'underline' },
  accountScreen: { flex: 1, padding: 24, justifyContent: 'space-between' },
  back: { color: C.ink, fontSize: 13, fontWeight: '800', marginTop: 6 },
  accountTitle: { color: C.inkDark, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 46, lineHeight: 48, letterSpacing: -2 },
  formGroup: { gap: 10 },
  fieldLabel: { color: C.ink, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginTop: 10, marginBottom: 7 },
  input: { height: 52, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper, paddingHorizontal: 15, color: C.inkDark, fontSize: 15 },
  usernameInput: { height: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, backgroundColor: C.paper, paddingHorizontal: 15 },
  at: { color: C.coral, fontWeight: '900', fontSize: 16 },
  usernameText: { flex: 1, height: '100%', paddingHorizontal: 6, color: C.inkDark, fontSize: 15 },
  disabled: { opacity: 0.35 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 26 },
  headerTitle: { color: C.inkDark, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 38, lineHeight: 39, letterSpacing: -1.7 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.ink },
  avatarText: { color: C.ink, fontSize: 11, fontWeight: '900' },
  avatarTextLight: { color: C.white, fontSize: 11, fontWeight: '900' },
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
  postActivity: { color: C.inkDark, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 26, marginBottom: 4 },
  postDuration: { color: C.ink, fontSize: 10, fontWeight: '800', marginBottom: 13 },
  postCaption: { color: C.muted, fontSize: 12, lineHeight: 19, marginBottom: 16 },
  reactionRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 13 },
  reaction: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: C.line },
  reactionOn: { backgroundColor: C.blush, borderColor: C.coral },
  reactionIcon: { color: C.coral, fontSize: 15 },
  reactionText: { color: C.ink, fontSize: 10, fontWeight: '800' },
  completionGoalCard: { backgroundColor: C.ink, paddingHorizontal: 18, paddingVertical: 15, marginBottom: 12 },
  completionGoalCategory: { color: C.coral, fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginBottom: 5 },
  completionGoalTitle: { color: C.white, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 22 },
  photoPicker: { minHeight: 260, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, marginBottom: 20, overflow: 'hidden' },
  emptyPhoto: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: 25 },
  cameraCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#E7E9DD', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  cameraIcon: { color: C.ink, fontSize: 30 },
  photoTitle: { color: C.inkDark, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 22, marginBottom: 7 },
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
  profileName: { color: C.inkDark, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 31, letterSpacing: -1 },
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
  miniTitle: { color: C.inkDark, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 19 },
  emptyProof: { alignItems: 'center', padding: 35, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed', marginBottom: 25 },
  emptyProofIcon: { color: C.sage, fontSize: 42, marginBottom: 10 },
  emptyProofTitle: { color: C.inkDark, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 20, marginBottom: 6 },
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
  reminderTitle: { color: C.inkDark, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 20, marginBottom: 5 },
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
  bottomNav: { minHeight: 70, paddingBottom: Platform.OS === 'ios' ? 10 : 4, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.paper, flexDirection: 'row', alignItems: 'center' },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navIcon: { color: C.muted, fontSize: 19, fontWeight: '700' },
  navLabel: { color: C.muted, fontSize: 8, fontWeight: '800' },
  navActive: { color: C.coral },
  logNav: { width: 42, height: 42, marginTop: -22, borderRadius: 21, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: C.paper },
  logNavActive: { backgroundColor: C.coral },
  logNavIcon: { color: C.white, fontSize: 25, lineHeight: 27 },
});
