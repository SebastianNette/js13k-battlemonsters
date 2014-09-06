/**
 * extremely chopped down version of jsfxr, not using any params which are not used ingame
 *
 * SfxrParams
 *
 * Copyright 2010 Thomas Vian
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author Thomas Vian
 */

var _pow = Math.pow;
function _SfxrParams() {
  this._s = function(_values) {
    for ( var i = 0; i < 24; i++ )  {
      this[String.fromCharCode( 97 + i )] = _values[i] || 0;
    }
    var _totalTime = this.c + this.e;
    if (_totalTime < .18) {
      var _multiplier = .18 / _totalTime;
      this.b *= _multiplier;
      this.c *= _multiplier;
      this.e *= _multiplier;
    }
  }
}

function _SfxrSynth() {
 
  this._p = new _SfxrParams();  // Params instance

  var _envelopeLength0, // Length of the attack stage
      _envelopeLength1, // Length of the sustain stage
      _envelopeLength2, // Length of the decay stage

      _period,          // Period of the wave
      _maxPeriod,       // Maximum period before sound stops (from minFrequency)

      _slide,           // Note slide
      _deltaSlide,      // Change in slide

      _changeAmount,    // Amount to change the note by
      _changeTime,      // Counter for the note change
      _changeLimit,     // Once the time reaches this limit, the note changes

      _squareDuty,      // Offset of center switching point in the square wave
      _dutySweep;       // Amount to change the duty by


  this._r = function() {
    // Shorter reference
    var _p = this._p;

    _period       = 100 / (_p.f * _p.f + .001);
    _maxPeriod    = 100000;

    _slide        = 1 - _pow(_p.h,3) * .01;
    _deltaSlide   = 0;

	_changeAmount =  1 + _p.l * _p.l * (_p.l > 0 ? -.9 : 10);
    _changeTime   = 0;
    _changeLimit  = _p.m == 1 ? 0 : (1 - _p.m) * (1 - _p.m) * 20000 + 32;
  }

  // I split the reset() function into two functions for better readability
  this._t = function() {
    this._r();

    // Shorter reference
    var _p = this._p;

	// Calculating the length is all that remained here, everything else moved somewhere
    _envelopeLength0 = 0;
    _envelopeLength1 = _p.c * _p.c * 100000;
    _envelopeLength2 = _p.e   * _p.e   * 100000 + 12;
    // Full length of the volume envelop (and therefore sound)
    // Make sure the length can be divided by 3 so we will not need the padding "==" after base64 encode
    return ((_envelopeLength0 + _envelopeLength1 + _envelopeLength2) / 3 | 0) * 3;
  }

  /**
   * Writes the wave to the supplied buffer ByteArray
   * @param buffer A ByteArray to write the wave to
   * @return If the wave is finished
   */
  this._w = function(buffer, length) {
    // Shorter reference
    var _p = this._p;

    // If the filters are active
    var _filters = _p.s != 1 || _p.v,
        // Cutoff multiplier which adjusts the amount the wave position can move
        _hpFilterCutoff = _p.v * _p.v * .1,
        // Speed of the high-pass cutoff multiplier
        _hpFilterDeltaCutoff = 1,
        // Cutoff multiplier which adjusts the amount the wave position can move
        _lpFilterCutoff = _pow(_p.s,3) * .1,
        // Speed of the low-pass cutoff multiplier
        _lpFilterDeltaCutoff = 1,
        // If the low pass filter is active
        _lpFilterOn = _p.s != 1,
        // masterVolume * masterVolume (for quick calculations)
        _masterVolume = _p.x * _p.x,
        // Minimum frequency before stopping
        _minFreqency = 0,
        // If the phaser is active
        _phaser = 0,
        // Change in phase offset
        _phaserDeltaOffset = 0,
        // Phase offset for phaser effect
        _phaserOffset = 0,
        // Once the time reaches this limit, some of the    iables are reset
        _repeatLimit = 0,
        // The punch factor (louder at begining of sustain)
        _sustainPunch = _p.d,
        // Amount to change the period of the wave by at the peak of the vibrato wave
        _vibratoAmplitude = 0,
        // Speed at which the vibrato phase moves
        _vibratoSpeed = 0,
        // The type of wave to generate
        _waveType = _p.a;

    var _envelopeLength      = _envelopeLength0,     // Length of the current envelope stage
        _envelopeOverLength0 = 1 / _envelopeLength0, // (for quick calculations)
        _envelopeOverLength1 = 1 / _envelopeLength1, // (for quick calculations)
        _envelopeOverLength2 = 1 / _envelopeLength2; // (for quick calculations)

    // Damping muliplier which restricts how fast the wave position can move
    var _lpFilterDamping = 5 * (.01 + _lpFilterCutoff);
    if (_lpFilterDamping > .8) {
      _lpFilterDamping = .8;
    }
    _lpFilterDamping = 1 - _lpFilterDamping;

    var _finished = false,     // If the sound has finished
        _envelopeStage    = 0, // Current stage of the envelope (attack, sustain, decay, end)
        _envelopeTime     = 0, // Current time through current enelope stage
        _envelopeVolume   = 0, // Current volume of the envelope
        _hpFilterPos      = 0, // Adjusted wave position after high-pass filter
        _lpFilterDeltaPos = 0, // Change in low-pass wave position, as allowed by the cutoff and damping
        _lpFilterOldPos,       // Previous low-pass wave position
        _lpFilterPos      = 0, // Adjusted wave position after low-pass filter
        _periodTemp,           // Period modified by vibrato
        _phase            = 0, // Phase through the wave
        _phaserInt,            // Integer phaser offset, for bit maths
        _phaserPos        = 0, // Position through the phaser buffer
        _pos,                  // Phase expresed as a Number from 0-1, used for fast sin approx
        _repeatTime       = 0, // Counter for the repeats
        _sample,               // Sub-sample calculated 8 times per actual sample, averaged out to get the super sample
        _superSample,          // Actual sample writen to the wave
        _vibratoPhase     = 0; // Phase through the vibrato sine wave

    // Buffer of wave values used to create the out of phase second wave
    var _phaserBuffer = new Array(1024),
        // Buffer of random values used to generate noise
        _noiseBuffer  = new Array(32);
    for (var i = _phaserBuffer.length; i--; ) {
      _phaserBuffer[i] = 0;
    }
    for (var i = _noiseBuffer.length; i--; ) {
      _noiseBuffer[i] = Math.random() * 2 - 1;
    }

    for (var i = 0; i < length; i++) {
      if (_finished) {
        return i;
      }

      // Repeats every _repeatLimit times, partially resetting the sound parameters
      if (_repeatLimit) {
        if (++_repeatTime >= _repeatLimit) {
          _repeatTime = 0;
          this._r();
        }
      }

      // If _changeLimit is reached, shifts the pitch
      if (_changeLimit) {
        if (++_changeTime >= _changeLimit) {
          _changeLimit = 0;
          _period *= _changeAmount;
        }
      }

      // Acccelerate and apply slide
      _slide += _deltaSlide;
      _period *= _slide;

      // Checks for frequency getting too low, and stops the sound if a minFrequency was set
      if (_period > _maxPeriod) {
        _period = _maxPeriod;
        if (_minFreqency > 0) {
          _finished = true;
        }
      }

      _periodTemp = _period;

      // Applies the vibrato effect
      if (_vibratoAmplitude > 0) {
        _vibratoPhase += _vibratoSpeed;
        _periodTemp *= 1 + Math.sin(_vibratoPhase) * _vibratoAmplitude;
      }

      _periodTemp |= 0;
      if (_periodTemp < 8) {
        _periodTemp = 8;
      }

      // Sweeps the square duty
      if (!_waveType) {
        _squareDuty += _dutySweep;
        if (_squareDuty < 0) {
          _squareDuty = 0;
        } else if (_squareDuty > .5) {
          _squareDuty = .5;
        }
      }

      // Moves through the different stages of the volume envelope
      if (++_envelopeTime > _envelopeLength) {
        _envelopeTime = 0;

        switch (++_envelopeStage)  {
          case 1:
            _envelopeLength = _envelopeLength1;
            break;
          case 2:
            _envelopeLength = _envelopeLength2;
        }
      }

      // Sets the volume based on the position in the envelope
      switch (_envelopeStage) {
        case 0:
          _envelopeVolume = _envelopeTime * _envelopeOverLength0;
          break;
        case 1:
          _envelopeVolume = 1 + (1 - _envelopeTime * _envelopeOverLength1) * 2 * _sustainPunch;
          break;
        case 2:
          _envelopeVolume = 1 - _envelopeTime * _envelopeOverLength2;
          break;
        case 3:
          _envelopeVolume = 0;
          _finished = true;
      }

      // Moves the phaser offset
      if (_phaser) {
        _phaserOffset += _phaserDeltaOffset;
        _phaserInt = _phaserOffset | 0;
        if (_phaserInt < 0) {
          _phaserInt = -_phaserInt;
        } else if (_phaserInt > 1023) {
          _phaserInt = 1023;
        }
      }

      // Moves the high-pass filter cutoff
      if (_filters && _hpFilterDeltaCutoff) {
        _hpFilterCutoff *= _hpFilterDeltaCutoff;
        if (_hpFilterCutoff < .00001) {
          _hpFilterCutoff = .00001;
        } else if (_hpFilterCutoff > .1) {
          _hpFilterCutoff = .1;
        }
      }

      _superSample = 0;
      for (var j = 8; j--; ) {
        // Cycles through the period
        _phase++;
        if (_phase >= _periodTemp) {
          _phase %= _periodTemp;

          // Generates new random noise for this period
          if (_waveType == 3) {
            for (var n = _noiseBuffer.length; n--; ) {
              _noiseBuffer[n] = Math.random() * 2 - 1;
            }
          }
        }

        // Gets the sample from the oscillator
        switch (_waveType) {
          case 0: // Square wave
            _sample = ((_phase / _periodTemp) < _squareDuty) ? .5 : -.5;
            break;
          case 1: // Saw wave
            _sample = 1 - _phase / _periodTemp * 2;
            break;
          case 2: // Sine wave (fast and accurate approx)
            _pos = _phase / _periodTemp;
            _pos = (_pos > .5 ? _pos - 1 : _pos) * 6.28318531;
            _sample = 1.27323954 * _pos + .405284735 * _pos * _pos * (_pos < 0 ? 1 : -1);
            _sample = .225 * ((_sample < 0 ? -1 : 1) * _sample * _sample  - _sample) + _sample;
            break;
          case 3: // Noise
            _sample = _noiseBuffer[Math.abs(_phase * 32 / _periodTemp | 0)];
        }

        // Applies the low and high pass filters
        if (_filters) {
          _lpFilterOldPos = _lpFilterPos;
          _lpFilterCutoff *= _lpFilterDeltaCutoff;
          if (_lpFilterCutoff < 0) {
            _lpFilterCutoff = 0;
          } else if (_lpFilterCutoff > .1) {
            _lpFilterCutoff = .1;
          }

          if (_lpFilterOn) {
            _lpFilterDeltaPos += (_sample - _lpFilterPos) * _lpFilterCutoff;
            _lpFilterDeltaPos *= _lpFilterDamping;
          } else {
            _lpFilterPos = _sample;
            _lpFilterDeltaPos = 0;
          }

          _lpFilterPos += _lpFilterDeltaPos;

          _hpFilterPos += _lpFilterPos - _lpFilterOldPos;
          _hpFilterPos *= 1 - _hpFilterCutoff;
          _sample = _hpFilterPos;
        }

        // Applies the phaser effect
        if (_phaser) {
          _phaserBuffer[_phaserPos % 1024] = _sample;
          _sample += _phaserBuffer[(_phaserPos - _phaserInt + 1024) % 1024];
          _phaserPos++;
        }

        _superSample += _sample;
      }

      // Averages out the super samples and applies volumes
      _superSample *= .125 * _envelopeVolume * _masterVolume;

      // Clipping if too loud
      buffer[i] = _superSample >= 1 ? 32767 : _superSample <= -1 ? -32768 : _superSample * 32767 | 0;
    }

    return length;
  }
}

// Adapted from http://codebase.es/riffwave/
var _synth = new _SfxrSynth();
// Export for the Closure Compiler
var jsfxr = function(_settings) {
  // Initialize _SfxrParams
  _synth._p._s(_settings);
  // Synthesize Wave
  var _envelopeFullLength = _synth._t();
  var _data = new Uint8Array(((_envelopeFullLength + 1) / 2 | 0) * 4 + 44);
  var _used = _synth._w(new Uint16Array(_data.buffer, 44), _envelopeFullLength) * 2;
  var _dv = new Uint32Array(_data.buffer, 0, 44);
  // Initialize header
  _dv[0] = 0x46464952; // "RIFF"
  _dv[1] = _used + 36;  // put total size here
  _dv[2] = 0x45564157; // "WAVE"
  _dv[3] = 0x20746D66; // "fmt "
  _dv[4] = 0x00000010; // size of the following
  _dv[5] = 0x00010001; // Mono: 1 channel, PCM format
  _dv[6] = 0x0000AC44; // 44,100 samples per second
  _dv[7] = 0x00015888; // byte rate: two bytes per sample
  _dv[8] = 0x00100002; // 16 bits per sample, aligned on every two bytes
  _dv[9] = 0x61746164; // "data"
  _dv[10] = _used;      // put number of samples here

  // Base64 encoding written by me, @maettig
  _used += 44;
  var i = 0,
      _base64Characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
      _output = 'data:audio/wav;base64,';
  for (; i < _used; i += 3)
  {
    var a = _data[i] << 16 | _data[i + 1] << 8 | _data[i + 2];
    _output += _base64Characters[a >> 18] + _base64Characters[a >> 12 & 63] + _base64Characters[a >> 6 & 63] + _base64Characters[a & 63];
  }
  return _output;
}