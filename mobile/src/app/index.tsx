import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
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

type Tab = 'today' | 'feed' | 'log' | 'friends' | 'profile';
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
          <ProfileScreen user={user} goals={goals} posts={posts} friends={friends} />
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
  onLog,
}: {
  user: User;
  goals: Goal[];
  onLog: (goal: Goal) => void;
}) {
  const completed = goals.filter((goal) => goal.done).length;
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Header
        label="THURSDAY · WEEK 31"
        title={`Keep your word,\n${user.name.split(' ')[0]}.`}
        action={<View style={styles.avatar}><Text style={styles.avatarText}>{initials(user.name)}</Text></View>}
      />
      <View style={styles.scoreCard}>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreValue}>{Math.round(((completed + 7) / (goals.length + 8)) * 100)}%</Text>
          <Text style={styles.scoreLabel}>KEPT</Text>
        </View>
        <View style={styles.scoreCopy}>
          <Text style={styles.scoreTitle}>One honest action at a time.</Text>
          <Text style={styles.mutedText}>Complete a promise with photo proof to share it.</Text>
        </View>
      </View>

      <View style={styles.sectionRow}>
        <View><Text style={styles.eyebrow}>TODAY&apos;S CONTRACT</Text><Text style={styles.sectionTitle}>Your promises</Text></View>
        <Text style={styles.sectionMeta}>{completed}/{goals.length} KEPT</Text>
      </View>
      <View style={styles.goalCard}>
        {goals.map((goal, index) => (
          <View key={goal.id} style={[styles.goalRow, index === goals.length - 1 && styles.noBorder]}>
            <Text style={styles.goalIndex}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.goalCopy}>
              <Text style={styles.goalCategory}>{goal.category}</Text>
              <Text style={[styles.goalTitle, goal.done && styles.strike]}>{goal.title}</Text>
              <Text style={styles.goalDetail}>{goal.detail}</Text>
            </View>
            {goal.done ? (
              <View style={styles.doneBox}><Text style={styles.doneCheck}>✓</Text></View>
            ) : (
              <Pressable style={styles.proofButton} onPress={() => onLog(goal)}>
                <Text style={styles.proofIcon}>＋</Text>
                <Text style={styles.proofText}>LOG</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      <Text style={[styles.eyebrow, { marginTop: 32 }]}>THIS WEEK</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekCards}>
        <View style={styles.weekCard}>
          <View style={styles.weekTop}><Text style={styles.weekIcon}>M</Text><Text style={styles.onTrack}>ON TRACK</Text></View>
          <Text style={styles.weekTitle}>Exercise 4 times</Text>
          <Text style={styles.weekNumber}>3 <Text style={styles.weekOutOf}>of 4 sessions</Text></Text>
          <View style={styles.progress}><View style={[styles.progressFill, { width: '75%' }]} /></View>
        </View>
        <View style={styles.weekCard}>
          <View style={styles.weekTop}><Text style={[styles.weekIcon, { backgroundColor: C.coral }]}>F</Text><Text style={styles.attention}>NEEDS ATTENTION</Text></View>
          <Text style={styles.weekTitle}>Cook 5 balanced meals</Text>
          <Text style={styles.weekNumber}>2 <Text style={styles.weekOutOf}>of 5 meals</Text></Text>
          <View style={styles.progress}><View style={[styles.progressFill, { width: '40%', backgroundColor: C.coral }]} /></View>
        </View>
      </ScrollView>
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
  const [goalId, setGoalId] = useState(initial.id);
  const [photo, setPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [duration, setDuration] = useState('');
  const activeGoal = goals.find((goal) => goal.id === goalId) ?? initial;

  async function choosePhoto(source: 'camera' | 'library') {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera permission needed', 'Allow camera access to capture proof of your activity.');
        return;
      }
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }

  const ready = Boolean(photo && caption.trim());
  function share() {
    if (!ready) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onPublish({
      id: `mine-${Date.now()}`,
      author: user.name,
      username: user.username,
      initials: initials(user.name),
      avatarColor: C.ink,
      activity: activeGoal.title,
      category: activeGoal.category,
      caption: caption.trim(),
      image: photo ?? undefined,
      time: 'Just now',
      duration: duration.trim() || activeGoal.detail,
      reactions: { heart: 0, kudos: 0 },
      mine: true,
    });
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Header label="PROOF, NOT PROMISES" title="Log it. Make it real." />
      <Text style={styles.fieldLabel}>COMPLETED ACTIVITY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {goals.map((goal) => (
          <Pressable
            key={goal.id}
            style={[styles.chip, goal.id === goalId && styles.chipActive]}
            onPress={() => setGoalId(goal.id)}>
            <Text style={[styles.chipText, goal.id === goalId && styles.chipTextActive]}>{goal.title}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.photoPicker}>
        {photo ? (
          <>
            <Image source={{ uri: photo }} style={styles.selectedPhoto} alt="Selected activity proof" />
            <Pressable style={styles.replacePhoto} onPress={() => choosePhoto('library')}>
              <Text style={styles.replaceText}>Replace photo</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.emptyPhoto}>
            <View style={styles.cameraCircle}><Text style={styles.cameraIcon}>◎</Text></View>
            <Text style={styles.photoTitle}>Add proof of the work</Text>
            <Text style={styles.photoHint}>A quick, honest photo. It does not need to be perfect.</Text>
            <View style={styles.photoActions}>
              <Pressable style={styles.cameraButton} onPress={() => choosePhoto('camera')}>
                <Text style={styles.cameraButtonText}>Take photo</Text>
              </Pressable>
              <Pressable style={styles.libraryButton} onPress={() => choosePhoto('library')}>
                <Text style={styles.libraryButtonText}>Choose existing</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <Text style={styles.fieldLabel}>HOW DID IT GO?</Text>
      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="One honest sentence about showing up..."
        placeholderTextColor="#92968F"
        style={styles.captionInput}
        multiline
        textAlignVertical="top"
      />
      <Text style={styles.fieldLabel}>DETAIL OR DURATION <Text style={styles.optional}>OPTIONAL</Text></Text>
      <TextInput
        value={duration}
        onChangeText={setDuration}
        placeholder="e.g. 45 minutes · 5.2 km · 4 meals"
        placeholderTextColor="#92968F"
        style={styles.input}
      />
      <Pressable disabled={!ready} style={[styles.shareButton, !ready && styles.disabled]} onPress={share}>
        <Text style={styles.shareButtonText}>Share completion</Text>
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
}: {
  user: User;
  goals: Goal[];
  posts: Post[];
  friends: Friend[];
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
          <Text style={styles.emptyProofIcon}>◎</Text>
          <Text style={styles.emptyProofTitle}>Your proof will live here.</Text>
          <Text style={styles.emptyProofText}>Complete an activity and share your first photo.</Text>
        </View>
      )}
      <View style={styles.settingsCard}>
        {['Account & privacy', 'Notification settings', 'Community guidelines'].map((item) => (
          <Pressable key={item} style={styles.settingsRow}>
            <Text style={styles.settingsText}>{item}</Text><Text style={styles.settingsArrow}>›</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function BottomNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const items: { id: Tab; icon: string; label: string }[] = [
    { id: 'today', icon: '✓', label: 'Today' },
    { id: 'feed', icon: '◫', label: 'Feed' },
    { id: 'log', icon: '+', label: 'Log' },
    { id: 'friends', icon: '♧', label: 'Friends' },
    { id: 'profile', icon: '○', label: 'Me' },
  ];
  return (
    <View style={styles.bottomNav}>
      {items.map((item) => {
        const active = tab === item.id;
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
  onboardArt: { flex: 0.9, minHeight: 290, backgroundColor: C.ink, overflow: 'hidden', justifyContent: 'flex-end', padding: 28 },
  onboardSquare: { position: 'absolute', width: 175, height: 175, right: -35, top: 8, backgroundColor: C.sage, opacity: 0.85 },
  onboardRing: { position: 'absolute', width: 230, height: 230, borderRadius: 115, borderWidth: 42, borderColor: C.coral, right: -80, bottom: -35 },
  onboardMini: { color: C.cream, fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  onboardBody: { flex: 1.2, padding: 28, justifyContent: 'center' },
  eyebrow: { color: C.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1.6, marginBottom: 10 },
  onboardTitle: { color: C.inkDark, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 51, lineHeight: 52, letterSpacing: -2.2, marginBottom: 20 },
  onboardText: { color: C.muted, fontSize: 15, lineHeight: 23, marginBottom: 25 },
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
  proofButton: { width: 42, alignItems: 'center', gap: 3 },
  proofIcon: { color: C.ink, fontSize: 25, fontWeight: '300' },
  proofText: { color: C.ink, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
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
  chips: { gap: 8, paddingBottom: 20 },
  chip: { borderWidth: 1, borderColor: C.line, backgroundColor: C.paper, paddingHorizontal: 14, paddingVertical: 11 },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { color: C.ink, fontSize: 10, fontWeight: '800' },
  chipTextActive: { color: C.white },
  photoPicker: { minHeight: 292, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, marginBottom: 18, overflow: 'hidden' },
  emptyPhoto: { flex: 1, minHeight: 292, alignItems: 'center', justifyContent: 'center', padding: 25 },
  cameraCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#E7E9DD', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  cameraIcon: { color: C.ink, fontSize: 30 },
  photoTitle: { color: C.inkDark, fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 22, marginBottom: 7 },
  photoHint: { color: C.muted, textAlign: 'center', fontSize: 11, lineHeight: 17, maxWidth: 260 },
  photoActions: { flexDirection: 'row', gap: 8, marginTop: 20 },
  cameraButton: { backgroundColor: C.ink, paddingHorizontal: 16, paddingVertical: 12 },
  cameraButtonText: { color: C.white, fontSize: 10, fontWeight: '900' },
  libraryButton: { borderWidth: 1, borderColor: C.ink, paddingHorizontal: 16, paddingVertical: 12 },
  libraryButtonText: { color: C.ink, fontSize: 10, fontWeight: '900' },
  selectedPhoto: { width: '100%', height: 310 },
  replacePhoto: { position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(16,44,37,.88)', paddingHorizontal: 12, paddingVertical: 9 },
  replaceText: { color: C.white, fontSize: 9, fontWeight: '900' },
  captionInput: { minHeight: 112, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper, padding: 15, color: C.inkDark, fontSize: 14, lineHeight: 20 },
  optional: { color: C.muted, fontWeight: '600' },
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
  bottomNav: { minHeight: 70, paddingBottom: Platform.OS === 'ios' ? 10 : 4, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.paper, flexDirection: 'row', alignItems: 'center' },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navIcon: { color: C.muted, fontSize: 19, fontWeight: '700' },
  navLabel: { color: C.muted, fontSize: 8, fontWeight: '800' },
  navActive: { color: C.coral },
  logNav: { width: 42, height: 42, marginTop: -22, borderRadius: 21, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: C.paper },
  logNavActive: { backgroundColor: C.coral },
  logNavIcon: { color: C.white, fontSize: 25, lineHeight: 27 },
});
