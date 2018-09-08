class Classifier {
  constructor() {
    this._songList = {
      allChords: new Set(),
      difficulties: {
        EASY: 'easy',
        MEDIUM: 'medium',
        HARD: 'hard'
      },
      songs: [],
      addSong: function (name, chords, difficulty) {
        this.songs.push({
          name,
          chords,
          difficulty
        })
      }
    }
    this._labelCounts = new Map()
    this._labelProbabilities = new Map()
    this.chordCountsInLabels = new Map()
    this._smoothing = 1.01
  }
  addSong(...songParameters) {
    this._songList.addSong(...songParameters)
  }
  _chordCountForDifficulty(difficulty, testChord) {
    return this._songList.songs.reduce((counter, song) => {
      if (song.difficulty === difficulty) {
        counter += song.chords.filter(chord => chord === testChord).length;
      }
      return counter;
    }, 0);
  }
  _likelihoodFromChord(difficulty, chord) {
    return this._chordCountForDifficulty(difficulty, chord) /
      this._songList.songs.length;
  }
  _valueForChordDifficulty(difficulty, chord) {
    const value = this._likelihoodFromChord(difficulty, chord);
    return value ? value + this._smoothing : 1;
  }
  trainAll() {
    this._songList.songs.forEach((song) => {
      this._train(song.chords, song.difficulty);
    });
    this._setLabelProbabilities();
  }
  _train(chords, label) {
    chords.forEach(chord => this._songList.allChords.add(chord));
    if (Array.from(this._labelCounts.keys()).includes(label)) {
      this._labelCounts.set(label, this._labelCounts.get(label) + 1);
    } else {
      this._labelCounts.set(label, 1);
    }
  }
  _setLabelProbabilities() {
    this._labelCounts.forEach((_count, label) => {
      this._labelProbabilities.set(label, this._labelCounts.get(label) /
        this._songList.songs.length);
    });
  }
  classify(chords) {
    return new Map(Array.from(
      this._labelProbabilities.entries()).map((labelWithProbability) => {
      const difficulty = labelWithProbability[0];
      return [difficulty, chords.reduce((total, chord) => {
        return total * this._valueForChordDifficulty(difficulty, chord);
      }, this._labelProbabilities.get(difficulty) + this._smoothing)];
    }));
  }
};

// unit tests

const wish = require('wish');
describe('the file', () => {
  const classifier = new Classifier();
  classifier.addSong('imagine', ['c', 'cmaj7', 'f', 'am', 'dm', 'g', 'e7'], classifier._songList.difficulties.EASY)
  classifier.addSong('somewhereOverTheRainbow', ['c', 'em', 'f', 'g', 'am'], classifier._songList.difficulties.EASY)
  classifier.addSong('tooManyCooks', ['c', 'g', 'f'], classifier._songList.difficulties.EASY)
  classifier.addSong('iWillFollowYouIntoTheDark', ['f', 'dm', 'bb', 'c', 'a', 'bbm'], classifier._songList.difficulties.MEDIUM)
  classifier.addSong('babyOneMoreTime', ['cm', 'g', 'bb', 'eb', 'fm', 'ab'], classifier._songList.difficulties.MEDIUM)
  classifier.addSong('creep', ['g', 'gsus4', 'b', 'bsus4', 'c', 'cmsus4', 'cm6'], classifier._songList.difficulties.MEDIUM)
  classifier.addSong('paperBag', ['bm7', 'e', 'c', 'g', 'b7', 'f', 'em', 'a', 'cmaj7', 'em7', 'a7', 'f7', 'b'], classifier._songList.difficulties.HARD)
  classifier.addSong('toxic', ['cm', 'eb', 'g', 'cdim', 'eb7', 'd7', 'db7', 'ab', 'gmaj7', 'g7'], classifier._songList.difficulties.HARD)
  classifier.addSong('bulletproof', ['d#m', 'g#', 'b', 'f#', 'g#m', 'c#'], classifier._songList.difficulties.HARD)

  classifier.trainAll()

  it('classifies', () => {
    const classified = classifier.classify(['f#m7', 'a', 'dadd9', 'dmaj7', 'bm', 'bm7', 'd', 'f#m']);
    wish(classified.get('easy') === 1.3433333333333333)
    wish(classified.get('medium') === 1.5060259259259259)
    wish(classified.get('hard') === 1.6884223991769547)
  })

  it('classifies again', () => {
    const classified = classifier.classify(['d', 'g', 'e', 'dm']);
    wish(classified.get('easy') === 2.023094827160494);
    wish(classified.get('medium') === 1.855758613168724);
    wish(classified.get('hard') === 1.855758613168724);
  })

  it('label probabilities', () => {
    wish(classifier._labelProbabilities.get('easy') === 0.3333333333333333);
    wish(classifier._labelProbabilities.get('medium') === 0.3333333333333333);
    wish(classifier._labelProbabilities.get('hard') === 0.3333333333333333);
  });
});