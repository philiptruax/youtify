﻿
var Search = {
    menuItem: null,
    youtubeVideosTab: null,
    soundCloudTracksTab: null,
    officialfmTracksTab: null,
    youtifyUsersTab: null,
    youtifyPlaylistsTab: null,
    searchTimeoutHandle: null,
    currentQuery: '',
    alternatives: undefined,
    lastVideosSearchQuery: undefined,
    lastPlaylistsSearchQuery: undefined,
    lastSoundCloudTracksQuery: undefined,
    itemsPerPage: 30,

    init: function() {
        /* Search on key up */
        $('#top .search input').keyup(function(event) {
            var i,
                deadKeys = [9, 16, 17, 18, 37, 38, 39, 40];
            for (i = 0; i < deadKeys.length; i += 1) {
                if (event.keyCode === deadKeys[i]) {
                    return;
                }
            }

            var timeout = 700,
                q = $.trim($('#top .search input').val());

            if (Search.searchTimeoutHandle) {
                clearTimeout(Search.searchTimeoutHandle);
            }

            if (event.keyCode === 13) {
                Search.search(q);
            } else {
                Search.searchTimeoutHandle = setTimeout(function() {
                    Search.search(q);
                }, timeout);
            }
        });

        (function() {
            var $search = $('#right .search');
            var timeout;
            $('#right .search').scroll(function(event) {
                if (timeout) {
                    clearTimeout(timeout);
                }
                timeout = setTimeout(function() {
                    var $pane = $('#right .search .pane.selected');
                    if ($search.scrollTop() >= ($pane.height() - $search.height()) && $pane.hasClass('has-more')) {
                        Search.search(Search.currentQuery, true);
                    }
                }, 100);
            });
        }());

        $('#top .search button').click(function() {
            Search.search($.trim($('#top .search input').val()));
        });
        EventSystem.addEventListener('video_started_playing_successfully', function() {
            Search.alternatives = undefined;
        });
    },
    getType: function() {
        if (Search.youtifyUsersTab.isSelected()) {
            return 'youtify-users';
        }

        if (Search.youtifyPlaylistsTab.isSelected()) {
            return 'youtify-playlists';
        }

        if (Search.soundCloudTracksTab.isSelected()) {
            return 'soundcloud-tracks';
        }

        if (Search.officialfmTracksTab.isSelected()) {
            return 'officialfm-tracks';
        }

        return Search.youtubeVideosTab.isSelected() ? 'youtube-videos' : 'youtube-playlists';
    },
    search: function(q, loadMore) {
        if (q.length === 0) {
            return;
        }

        var url = null,
            start = null,
            params = null;
        history.pushState(null, null, encodeURI('/search?q=' + q));
        Search.menuItem.select();
        Search.currentQuery = q;

        switch (Search.getType()) {
            case 'youtube-videos':
                if (Search.lastVideosSearchQuery === q && !loadMore) {
                    return;
                } else {
                    Search.lastVideosSearchQuery = q;
                    EventSystem.callEventListeners('new_search_executed', q);
                }
                /* Get the results */
                url = 'http://gdata.youtube.com/feeds/api/videos?callback=?';
                start = (loadMore) ? Search.youtubeVideosTab.paneView.data('results-count') + 1 : 1;
                params = {
                    'alt': 'json-in-script', 'max-results': Search.itemsPerPage,
                    'start-index': start,
                    'format': 5,
                    'q': q
                };

                /* Clean up destination */
                if (loadMore) {
                    Search.youtubeVideosTab.paneView.find('.loadMore').remove();
                } else {
                    Search.youtubeVideosTab.paneView.html('');
                }

                /* Get the results */
                LoadingBar.show();
                $.getJSON(url, params, function(data) {
                    /* Parse the results and create the views */
                    var results = Search.getVideosFromYouTubeSearchData(data, true);
                    $.each(results, function(i, video) {
                        if (video) {
                            video.onPlayCallback = function() {
                                Menu.find('search').setAsPlaying();
                            };
                            video.createListView().appendTo(Search.youtubeVideosTab.paneView);
                        }
                    });

                    var c = Search.youtubeVideosTab.paneView.data('results-count') || 0;
                    Search.youtubeVideosTab.paneView.data('results-count', c + results.length);

                    /* Load more? */
                    if (results.length >= Search.itemsPerPage) {
                        Search.youtubeVideosTab.paneView.addClass('has-more');
                    } else {
                        Search.youtubeVideosTab.paneView.removeClass('has-more');
                    }
                    LoadingBar.hide();
                });

                break;
            case 'soundcloud-tracks':
                if (Search.lastSoundCloudTracksQuery === q && !loadMore) {
                    return;
                } else {
                    Search.lastSoundCloudTracksQuery = q;
                    EventSystem.callEventListeners('new_search_executed', q);
                }

                start = (loadMore) ? Search.soundCloudTracksTab.paneView.data('results-count') + 1 : 1;

                url = 'https://api.soundcloud.com/tracks.json';
                params = {
                    'q': q,
                    'limit': Search.itemsPerPage,
                    'filter': 'streamable',
                    'offset': start,
                    'client_id': SOUNDCLOUD_API_KEY
                };

                /* Clean up destination */
                if (loadMore) {
                    Search.soundCloudTracksTab.paneView.find('.loadMore').remove();
                } else {
                    Search.soundCloudTracksTab.paneView.html('');
                }

                LoadingBar.show();
                $.getJSON(url, params, function(data) {
                    var results = Search.getVideosFromSoundCloudSearchData(data, true);
                    $.each(results, function(i, video) {
                        if (video) {
                            video.onPlayCallback = function() {
                                Menu.find('search').setAsPlaying();
                            };
                            video.createListView().appendTo(Search.soundCloudTracksTab.paneView);
                        }
                    });

                    var c = Search.soundCloudTracksTab.paneView.data('results-count') || 0;
                    Search.soundCloudTracksTab.paneView.data('results-count', c + results.length);

                    /* Load more? */
                    if (results.length >= Search.itemsPerPage) {
                        Search.soundCloudTracksTab.paneView.addClass('has-more');
                    } else {
                        Search.soundCloudTracksTab.paneView.removeClass('has-more');
                    }

                    LoadingBar.hide();
                });
                break;
            case 'officialfm-tracks':
                if (Search.lastOfficialfmTracksQuery === q && !loadMore) {
                    return;
                } else {
                    Search.lastOfficialfmTracksQuery = q;
                    EventSystem.callEventListeners('new_search_executed', q);
                }

                start = (loadMore) ? Search.officialfmTracksTab.paneView.data('results-count') + 1 : 1;

                url = 'http://api.official.fm/search/tracks/' + escape(q) + '/paginate';
                params = {
                    'format': 'json',
                    'per_page': 30,
                    'page': Math.ceil(start / 30),
                    'key': OFFICIALFM_API_KEY
                };

                /* Clean up destination */
                if (loadMore) {
                    Search.officialfmTracksTab.paneView.find('.loadMore').remove();
                } else {
                    Search.officialfmTracksTab.paneView.html('');
                }

                LoadingBar.show();
                $.getJSON(url, params, function(data) {
                    var results = Search.getVideosFromOfficialfmSearchData(data.tracks);
                    $.each(results, function(i, video) {
                        if (video) {
                            video.onPlayCallback = function() {
                                Menu.find('search').setAsPlaying();
                            };
                            video.createListView().appendTo(Search.officialfmTracksTab.paneView);
                        }
                    });

                    var c = Search.officialfmTracksTab.paneView.data('results-count') || 0;
                    Search.officialfmTracksTab.paneView.data('results-count', c + results.length);

                    /* Load more? */
                    if (data.current >= data.per_page) {
                        Search.officialfmTracksTab.paneView.addClass('has-more');
                    } else {
                        Search.officialfmTracksTab.paneView.removeClass('has-more');
                    }

                    LoadingBar.hide();
                });
                break;
            case 'youtify-users':
                if (Search.youtifyUsersQuery === q && !loadMore) {
                    return;
                } else {
                    Search.youtifyUsersQuery = q;
                    EventSystem.callEventListeners('new_search_executed', q);
                }

                start = (loadMore) ? Search.youtifyUsersTab.paneView.data('results-count') + 1 : 1;

                url = '/api/search/users';
                params = {
                    'q': q,
                    'per_page': 30,
                    'page': Math.ceil(start / 30)
                };

                /* Clean up destination */
                if (loadMore) {
                    Search.youtifyUsersTab.paneView.find('.loadMore').remove();
                } else {
                    Search.youtifyUsersTab.paneView.html('');
                }

                LoadingBar.show();
                $.get(url, params, function(data) {
                    var results = data;

                    $.each(results, function(i, user) {
                        new User(user).getSmallView().appendTo(Search.youtifyUsersTab.paneView);
                    });

                    var c = Search.youtifyUsersTab.paneView.data('results-count') || 0;
                    Search.youtifyUsersTab.paneView.data('results-count', c + results.length);

                    LoadingBar.hide();
                });
                break;
            case 'youtify-playlists':
                if (Search.youtifyPlaylistsQuery === q && !loadMore) {
                    return;
                } else {
                    Search.youtifyPlaylistsQuery = q;
                    EventSystem.callEventListeners('new_search_executed', q);
                }

                start = (loadMore) ? Search.youtifyPlaylistsTab.paneView.data('results-count') + 1 : 1;

                url = '/api/search/playlists';
                params = {
                    'q': q,
                    'per_page': 30,
                    'page': Math.ceil(start / 30)
                };

                /* Clean up destination */
                if (loadMore) {
                    Search.youtifyPlaylistsTab.paneView.find('.loadMore').remove();
                } else {
                    Search.youtifyPlaylistsTab.paneView.html('');
                }

                LoadingBar.show();
                $.get(url, params, function(data) {
                    var results = data;

                    $.each(results, function(i, playlist) {
                        new Playlist(playlist.title, playlist.videos, playlist.remoteId, playlist.owner, playlist.isPrivate).getSearchView().appendTo(Search.youtifyPlaylistsTab.paneView);
                    });

                    var c = Search.youtifyPlaylistsTab.paneView.data('results-count') || 0;
                    Search.youtifyPlaylistsTab.paneView.data('results-count', c + results.length);

                    LoadingBar.hide();
                });
                break;
        }
    },
    getVideosFromSoundCloudSearchData: function(data, includeUploader) {
        ret = [];
        $.each(data, function(i, track) {
            var buyLinks = track.purchase_url ? [track.purchase_url] : null;
            if (buyLinks) {
                console.log('buyLinks: ' + track.title);
            }
            ret.push(new Video({
                videoId: track.id,
                title: track.title,
                duration: track.duration,
                buyLinks: buyLinks,
                uploaderUsername: includeUploader ? track.user.permalink : null,
                type: 'soundcloud'
            }));
        });
        return ret;
    },
    getVideosFromOfficialfmSearchData: function(data) {
        ret = [];
        $.each(data, function(i, track) {
        var buyLinks = track.purchase_url ? [track.buy_url] : null;
            ret.push(new Video({
                videoId: track.id,
                title: track.title,
                duration: track.length * 1000,
                buyLinks: buyLinks,
                type: 'officialfm'
            }));
        });
        return ret;
    },
    getVideosFromYouTubeSearchData: function(data, includeUploader) {
        var results = [];
        if (data.feed.entry === undefined) {
            return results;
        }
        $.each(data.feed.entry, function(i, item) {
            if (item.media$group.media$content === undefined || item.media$group.media$content === null) {
                /* Content is blocked. Move on... */
                results.push(null);
                return;
            }

            var url = item.id.$t,
                title = item.title.$t,
                videoId;

            if (url.match('videos/(.*)$')) {
                videoId = url.match('videos/(.*)$')[1];
            } else {
                videoId = item.media$group.yt$videoid.$t;
            }

            var video = new Video({
                videoId: videoId,
                title: title,
                uploaderUsername: includeUploader ? item.author[0].name.$t : null,
                type: 'youtube'
            });
            results.push(video);
        });
        return results;
    },
    getPlaylistsFromYouTubeSearchData: function(data) {
        var results = [];
        if (data.feed.entry === undefined) {
            return results;
        }

        $.each(data.feed.entry, function(i, item) {
            var playlistId = item.yt$playlistId.$t,
                title = item.title.$t,
                videoCountHint = item.yt$countHint.$t;
            var playlist = new YouTubePlaylist(playlistId, title, videoCountHint);
            results.push(playlist);
        });
        return results;
    },
    findAlternative: function(video, callback) {
        console.log('finding alternative for ' + video.title);
        if (Search.alternatives === undefined) {
            Search.findAlternativesToVideo(video, function(videos) {
                Search.alternatives = videos;
                if (videos.length) {
                    callback(Search.alternatives.shift());
                } else {
                    callback(false);
                }
            });
        } else if (Search.alternatives.length) {
            callback(Search.alternatives.shift());
        } else {
            callback(false);
        }
    },
    findAlternativesToVideo: function(video, callback) {
        var results = [],
            url = 'http://gdata.youtube.com/feeds/api/videos?callback=?',
            params = {
                'alt': 'json-in-script',
                'max-results': 10,
                'start-index': 1,
                'format': 5,
                'q': video.title
            };

        $.getJSON(url, params, function(data) {
            if (data.feed.entry === undefined) {
                callback(results);
                return;
            }
            results = Search.getVideosFromYouTubeSearchData(data, true);
            callback(results);
        });
    }
};
