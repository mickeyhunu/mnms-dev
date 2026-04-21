/**
 * 파일 역할: 한국어 비속어/욕설 필터 라이브러리(사전 데이터 포함).
 */
(function attachKoProfanityFilter(globalScope) {
    const DEFAULT_PROFANITY_DICTIONARY = [
        '10새', '10세', '18년', '18놈', '18새끼', '18새', '18세끼', '18섹', '18쉑',
        '개같', '개같네', '개같은', '개년', '개놈', '개돼지', '개망나니', '개새', '개새끼', '개새키', '개색', '개색기',
        '개쉐', '개쉑', '개시발', '개쓰레기', '개자식', '개잡년', '개좆', '개지랄', '개호로',
        '걸레', '걸레년', '걸레같', '고자', '관종새끼', '광녀',
        '꼬추', '꼴통', '꼴페미', '꼴통새끼', '꺼져', '꺼져라', '꺼져버려',
        '나가뒤져', '나쁜년', '년놈', '노답새끼', '노예새끼',
        '닥쳐', '닥치고', '대가리깨', '도라이', '돌아이', '돌은새끼',
        '등신', '등신새끼', '따까리', '따까리새끼', '또라이', '또라이년', '또라이새끼',
        '미친', '미친개', '미친년', '미친놈', '미친새끼', '미친소리', '미친자식', '미친X',
        '병맛', '병신', '병신같', '병신년', '병신놈', '병신새끼', '병자', '븅신', '븅딱',
        '빡대가리', '빡통', '빨갱이새끼', '빨통',
        '새끼', '섹스', '섹파', '성병걸려', '성희롱충', '소추', '썅', '썅년', '썅놈', '쌍년', '쌍놈',
        '씨발', '씨빨', '씨부랄', '씨부럴', '씨부엉', '씨봉', '씨봉알', '씨팔', '씹년', '씹덕', '씹새', '씹새끼', '씹창',
        '아가리닥쳐', '애미', '애미뒤짐', '애미없', '애비없', '야동충', '염병', '오지게패', '육시랄',
        '존나', '존나게', '존내', '존멋', '존못', '좆', '좆같', '좆같네', '좆나', '좆도', '좆만', '좆밥', '좆병신', '좆빨',
        '좆집', '좆까', '좆까라', '좆까고', '좇같', '쥐랄', '지랄', '지럴', '찌질', '찌질이',
        '창녀', '창년', '창놈', '창녀촌', '쳐맞', '쳐죽', '쳐발', '쳐패',
        '한남충', '한녀충', '호구새끼', '호로', '호로새끼', '호모새끼', '후장',
        'fuck', 'fucking', 'shit', 'bitch', 'asshole', 'motherfucker'
    ];

    const CHAR_NORMALIZATION_MAP = {
        '@': 'a',
        '$': 's',
        '1': 'i',
        '!': 'i',
        '0': 'o',
        '2': 'z',
        '3': 'e',
        '4': 'a',
        '5': 's',
        '7': 't'
    };

    function normalizeForScan(input) {
        const value = String(input || '').toLowerCase();
        return value
            .split('')
            .map((ch) => CHAR_NORMALIZATION_MAP[ch] || ch)
            .join('')
            .replace(/\s+/g, '')
            .trim();
    }

    function getConfiguredCustomWords() {
        const dynamicWords = Array.isArray(globalScope.MNMS_BLOCKED_KEYWORDS) ? globalScope.MNMS_BLOCKED_KEYWORDS : [];
        const constantWords = Array.isArray(globalScope.CUSTOM_BLOCKED_KEYWORDS) ? globalScope.CUSTOM_BLOCKED_KEYWORDS : [];
        return [...constantWords, ...dynamicWords];
    }

    function createObscenityMatcherIfAvailable() {
        const obscenity = globalScope.obscenity || globalScope.Obscenity;
        if (!obscenity) return null;

        const { RegExpMatcher, englishDataset } = obscenity;
        if (!RegExpMatcher || !englishDataset || typeof englishDataset.build !== 'function') return null;

        try {
            return new RegExpMatcher({ ...englishDataset.build() });
        } catch (error) {
            return null;
        }
    }

    function createFilter(initialWords = DEFAULT_PROFANITY_DICTIONARY) {
        const obscenityMatcher = createObscenityMatcherIfAvailable();
        let dictionary = Array.from(new Set(initialWords.map((word) => normalizeForScan(word)).filter(Boolean)));
        const bootstrappedCustomWords = getConfiguredCustomWords().map((word) => normalizeForScan(word)).filter(Boolean);
        dictionary = Array.from(new Set([...dictionary, ...bootstrappedCustomWords]));

        function findFromDictionary(normalizedText) {
            return dictionary.find((word) => normalizedText.includes(word)) || null;
        }

        const api = {
            hasProfanity(text) {
                const normalizedText = normalizeForScan(text);
                if (!normalizedText) return false;
                if (obscenityMatcher && obscenityMatcher.hasMatch(text)) {
                    return true;
                }
                return dictionary.some((word) => normalizedText.includes(word));
            },
            findProfanity(text) {
                const normalizedText = normalizeForScan(text);
                if (!normalizedText) return null;
                if (obscenityMatcher && obscenityMatcher.hasMatch(text)) {
                    return '[obscenity-dataset-match]';
                }
                return findFromDictionary(normalizedText);
            },
            addWords(words) {
                const incomingWords = Array.isArray(words) ? words : [words];
                const normalizedWords = incomingWords
                    .map((word) => normalizeForScan(word))
                    .filter(Boolean);
                dictionary = Array.from(new Set([...dictionary, ...normalizedWords]));
            },
            setWords(words) {
                const incomingWords = Array.isArray(words) ? words : [words];
                const normalizedWords = incomingWords
                    .map((word) => normalizeForScan(word))
                    .filter(Boolean);
                dictionary = Array.from(new Set(normalizedWords));
            },
            getDictionarySize() {
                return dictionary.length;
            }
        };

        return api;
    }

    globalScope.KoProfanityFilter = createFilter();
})(window);
